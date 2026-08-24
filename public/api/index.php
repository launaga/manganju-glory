<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$configFile = '/home/haloglor/.haloglory/config.php';
if (!is_file($configFile)) respond(503, ['ok' => false, 'message' => 'CMS belum dikonfigurasi.']);
$config = require $configFile;

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['ok' => false, 'message' => 'Payload tidak valid.']);
    return $data;
}

function clientIp(): string {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 64);
}

function randomToken(): string {
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

function uuid(): string {
    $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function db(array $config): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function sendResetMail(array $config, string $email, string $token, bool $firstAccess = false): bool {
    $url = rtrim($config['app_url'], '/') . '/admin/reset-password?token=' . rawurlencode($token);
    $subject = $firstAccess ? 'Buat password MGL Admin' : 'Reset password MGL Admin';
    $intro = $firstAccess ? 'Akses admin MGL Anda sudah dibuat.' : 'Kami menerima permintaan reset password MGL Admin.';
    $message = "$intro\n\nBuka tautan sekali pakai berikut (berlaku 30 menit):\n$url\n\nJika Anda tidak meminta ini, abaikan email ini.";
    $headers = [
        'From: MGL Admin <' . $config['mail_from'] . '>',
        'Reply-To: ' . $config['mail_from'],
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: PHP/' . PHP_VERSION,
    ];
    return mail($email, $subject, $message, implode("\r\n", $headers));
}

function newPasswordToken(PDO $pdo, string $adminId): string {
    $raw = randomToken();
    $pdo->prepare('DELETE FROM password_tokens WHERE admin_id = ? OR expires_at < NOW()')->execute([$adminId]);
    $pdo->prepare('INSERT INTO password_tokens (token_hash, admin_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))')
        ->execute([hash('sha256', $raw), $adminId]);
    return $raw;
}

function sessionUser(PDO $pdo): ?array {
    $raw = $_COOKIE['mgl_admin_session'] ?? '';
    if (!is_string($raw) || strlen($raw) < 32) return null;
    $q = $pdo->prepare('SELECT a.id, a.email, s.csrf_hash FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>NOW()');
    $q->execute([hash('sha256', $raw)]);
    return $q->fetch() ?: null;
}

function requireUser(PDO $pdo): array {
    $user = sessionUser($pdo);
    if (!$user) respond(401, ['ok' => false, 'message' => 'Sesi berakhir. Silakan masuk kembali.']);
    return $user;
}

function requireCsrf(array $user): void {
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || !hash_equals($user['csrf_hash'], hash('sha256', $token))) {
        respond(403, ['ok' => false, 'message' => 'Permintaan keamanan tidak valid. Muat ulang halaman.']);
    }
}

function cleanRecord(array $row): array {
    $data = json_decode($row['data_json'], true) ?: [];
    $data['id'] = (string)$row['id'];
    $data['created_at'] = $data['created_at'] ?? $row['created_at'];
    $data['updated_at'] = $row['updated_at'];
    return $data;
}

function allowedTable(string $table): bool {
    static $allowed = ['site_settings','seo_settings','homepage','about','services','stats','projects','project_images','experience','skill_categories','skills','testimonials','blog_categories','blog_posts','contact_submissions'];
    return in_array($table, $allowed, true);
}

function tableOrFail(string $table): string {
    if (!allowedTable($table)) respond(404, ['ok' => false, 'message' => 'Koleksi tidak ditemukan.']);
    return $table;
}

function saveRecord(PDO $pdo, string $table, string $id, array $data, bool $upsert): array {
    unset($data['created_at'], $data['updated_at']);
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($upsert) {
        $q = $pdo->prepare('INSERT INTO cms_records (table_name,id,data_json) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data_json=VALUES(data_json),updated_at=NOW()');
        $q->execute([$table, $id, $json]);
    } else {
        $q = $pdo->prepare('INSERT INTO cms_records (table_name,id,data_json) VALUES (?,?,?)');
        $q->execute([$table, $id, $json]);
    }
    $q = $pdo->prepare('SELECT * FROM cms_records WHERE table_name=? AND id=?'); $q->execute([$table, $id]);
    return cleanRecord($q->fetch());
}

function setup(PDO $pdo, array $config, array $input): never {
    $provided = (string)($_SERVER['HTTP_X_SETUP_TOKEN'] ?? $input['setup_token'] ?? '');
    if ($provided === '' || !hash_equals($config['setup_token'], $provided)) respond(404, ['ok' => false, 'message' => 'Not found.']);
    $pdo->exec("CREATE TABLE IF NOT EXISTS setup_state (id TINYINT PRIMARY KEY, completed_at DATETIME NOT NULL)");
    if ((int)$pdo->query('SELECT COUNT(*) FROM setup_state')->fetchColumn() > 0) respond(409, ['ok' => false, 'message' => 'Setup sudah selesai.']);
    $schema = [
        "CREATE TABLE IF NOT EXISTS admins (id CHAR(36) PRIMARY KEY, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS admin_sessions (token_hash CHAR(64) PRIMARY KEY, admin_id CHAR(36) NOT NULL, csrf_hash CHAR(64) NOT NULL, ip_hash CHAR(64) NOT NULL, user_agent VARCHAR(255) NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(admin_id), INDEX(expires_at), FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS password_tokens (token_hash CHAR(64) PRIMARY KEY, admin_id CHAR(36) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(admin_id), INDEX(expires_at), FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS login_attempts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, email_hash CHAR(64) NOT NULL, ip_hash CHAR(64) NOT NULL, attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(email_hash,attempted_at), INDEX(ip_hash,attempted_at))",
        "CREATE TABLE IF NOT EXISTS reset_attempts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ip_hash CHAR(64) NOT NULL, attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(ip_hash,attempted_at))",
        "CREATE TABLE IF NOT EXISTS cms_records (table_name VARCHAR(64) NOT NULL, id VARCHAR(64) NOT NULL, data_json LONGTEXT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(table_name,id), INDEX(table_name,updated_at))",
        "CREATE TABLE IF NOT EXISTS media (id CHAR(36) PRIMARY KEY, file_name VARCHAR(255) NOT NULL, storage_path VARCHAR(500) NOT NULL UNIQUE, public_url VARCHAR(700) NOT NULL, mime_type VARCHAR(100) NULL, file_size INT UNSIGNED NULL, width INT UNSIGNED NULL, height INT UNSIGNED NULL, alt_id VARCHAR(500) NULL, alt_en VARCHAR(500) NULL, folder VARCHAR(40) NOT NULL DEFAULT 'general', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(folder), INDEX(created_at))",
    ];
    foreach ($schema as $sql) $pdo->exec($sql);
    $adminId = uuid();
    $pdo->prepare('INSERT INTO admins (id,email) VALUES (?,?)')->execute([$adminId, strtolower($config['admin_email'])]);
    foreach (($input['seed'] ?? []) as $table => $rows) {
        if (!allowedTable((string)$table) || !is_array($rows)) continue;
        foreach ($rows as $i => $row) {
            if (!is_array($row)) continue;
            $id = (string)($row['id'] ?? ($i + 1)); unset($row['id']);
            saveRecord($pdo, (string)$table, $id, $row, true);
        }
    }
    $token = newPasswordToken($pdo, $adminId);
    $mailed = sendResetMail($config, $config['admin_email'], $token, true);
    $pdo->exec('INSERT INTO setup_state (id,completed_at) VALUES (1,NOW())');
    respond(201, ['ok' => true, 'mail_sent' => $mailed, 'message' => $mailed ? 'Setup selesai dan email aktivasi terkirim.' : 'Setup selesai, tetapi server mail menolak email aktivasi.']);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api/?#', '/', $path);
$path = '/' . ltrim($path, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = db($config);

try {
    if ($path === '/health' && $method === 'GET') respond(200, ['ok' => true]);
    if ($path === '/internal/setup' && $method === 'POST') setup($pdo, $config, body());
    if ($path === '/internal/export' && $method === 'GET') {
        $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (!hash_equals('Bearer ' . $config['build_token'], $auth)) respond(404, ['ok' => false, 'message' => 'Not found.']);
        $tables = ['homepage','about','site_settings','seo_settings','services','stats','projects']; $out = [];
        foreach ($tables as $table) {
            $q = $pdo->prepare('SELECT * FROM cms_records WHERE table_name=? ORDER BY created_at ASC'); $q->execute([$table]);
            $out[$table] = array_map('cleanRecord', $q->fetchAll());
        }
        respond(200, ['ok' => true, 'data' => $out]);
    }

    if ($path === '/auth/login' && $method === 'POST') {
        $in = body(); $email = strtolower(trim((string)($in['email'] ?? ''))); $password = (string)($in['password'] ?? '');
        $eh = hash('sha256', $email); $ih = hash('sha256', clientIp());
        $q = $pdo->prepare('SELECT SUM(email_hash=?), SUM(ip_hash=?) FROM login_attempts WHERE attempted_at > DATE_SUB(NOW(),INTERVAL 30 MINUTE)'); $q->execute([$eh,$ih]);
        [$emailFailures,$ipFailures] = array_map('intval', $q->fetch(PDO::FETCH_NUM));
        if ($emailFailures >= 5 || $ipFailures >= 5) respond(429, ['ok'=>false,'message'=>'Terlalu banyak percobaan. Coba lagi setelah 30 menit.']);
        $q = $pdo->prepare('SELECT * FROM admins WHERE email=?'); $q->execute([$email]); $admin = $q->fetch();
        if (!$admin || !$admin['password_hash'] || !password_verify($password, $admin['password_hash'])) {
            $pdo->prepare('INSERT INTO login_attempts (email_hash,ip_hash) VALUES (?,?)')->execute([$eh,$ih]);
            $q = $pdo->prepare('SELECT SUM(email_hash=?), SUM(ip_hash=?) FROM login_attempts WHERE attempted_at > DATE_SUB(NOW(),INTERVAL 30 MINUTE)'); $q->execute([$eh,$ih]);
            [$emailFailures,$ipFailures] = array_map('intval', $q->fetch(PDO::FETCH_NUM));
            if ($emailFailures >= 5 || $ipFailures >= 5) respond(429, ['ok'=>false,'message'=>'Batas 5 percobaan tercapai. Akses dikunci 30 menit.']);
            respond(401, ['ok'=>false,'message'=>'Email atau password salah.']);
        }
        $pdo->prepare('DELETE FROM login_attempts WHERE email_hash=? OR ip_hash=?')->execute([$eh,$ih]);
        $session = randomToken(); $csrf = randomToken();
        $pdo->prepare('INSERT INTO admin_sessions (token_hash,admin_id,csrf_hash,ip_hash,user_agent,expires_at) VALUES (?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 12 HOUR))')
            ->execute([hash('sha256',$session),$admin['id'],hash('sha256',$csrf),$ih,substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''),0,255)]);
        setcookie('mgl_admin_session',$session,['expires'=>time()+43200,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
        respond(200,['ok'=>true,'user'=>['id'=>$admin['id'],'email'=>$admin['email']],'csrf_token'=>$csrf]);
    }

    if ($path === '/auth/me' && $method === 'GET') {
        $user = sessionUser($pdo); if (!$user) respond(401,['ok'=>false,'message'=>'Belum masuk.']);
        $csrf = randomToken(); $pdo->prepare('UPDATE admin_sessions SET csrf_hash=? WHERE token_hash=?')->execute([hash('sha256',$csrf),hash('sha256',(string)$_COOKIE['mgl_admin_session'])]);
        respond(200,['ok'=>true,'user'=>['id'=>$user['id'],'email'=>$user['email']],'csrf_token'=>$csrf]);
    }

    if ($path === '/auth/logout' && $method === 'POST') {
        $raw=(string)($_COOKIE['mgl_admin_session'] ?? ''); if ($raw) $pdo->prepare('DELETE FROM admin_sessions WHERE token_hash=?')->execute([hash('sha256',$raw)]);
        setcookie('mgl_admin_session','',['expires'=>1,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
        respond(200,['ok'=>true]);
    }

    if ($path === '/auth/request-password' && $method === 'POST') {
        $in=body(); $email=strtolower(trim((string)($in['email'] ?? ''))); $ih=hash('sha256',clientIp());
        $q=$pdo->prepare('SELECT COUNT(*) FROM reset_attempts WHERE ip_hash=? AND attempted_at>DATE_SUB(NOW(),INTERVAL 1 HOUR)');$q->execute([$ih]);
        if ((int)$q->fetchColumn()>=3) respond(429,['ok'=>false,'message'=>'Terlalu banyak permintaan. Coba lagi dalam satu jam.']);
        $pdo->prepare('INSERT INTO reset_attempts (ip_hash) VALUES (?)')->execute([$ih]);
        $q=$pdo->prepare('SELECT id,email,password_hash FROM admins WHERE email=?');$q->execute([$email]);$admin=$q->fetch();
        if ($admin) { $token=newPasswordToken($pdo,$admin['id']); sendResetMail($config,$admin['email'],$token,!$admin['password_hash']); }
        respond(200,['ok'=>true,'message'=>'Jika email terdaftar, tautan sekali pakai sudah dikirim.']);
    }

    if ($path === '/auth/reset-password' && $method === 'POST') {
        $in=body();$token=(string)($in['token']??'');$password=(string)($in['password']??'');
        if (strlen($password)<12 || strlen($password)>200) respond(422,['ok'=>false,'message'=>'Password harus 12–200 karakter.']);
        $q=$pdo->prepare('SELECT * FROM password_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW()');$q->execute([hash('sha256',$token)]);$row=$q->fetch();
        if (!$row) respond(400,['ok'=>false,'message'=>'Tautan tidak valid, sudah dipakai, atau kedaluwarsa.']);
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE admins SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$row['admin_id']]);
        $pdo->prepare('UPDATE password_tokens SET used_at=NOW() WHERE token_hash=?')->execute([$row['token_hash']]);
        $pdo->prepare('DELETE FROM admin_sessions WHERE admin_id=?')->execute([$row['admin_id']]);
        $pdo->commit(); respond(200,['ok'=>true,'message'=>'Password berhasil dibuat. Silakan masuk.']);
    }

    if ($path === '/contact' && $method === 'POST') {
        $in=body(); if (!empty($in['company'])) respond(201,['ok'=>true]);
        $name=trim((string)($in['name']??''));$email=trim((string)($in['email']??''));$message=trim((string)($in['message']??''));
        if ($name==='' || !filter_var($email,FILTER_VALIDATE_EMAIL) || $message==='' || strlen($message)>10000) respond(422,['ok'=>false,'message'=>'Data formulir tidak valid.']);
        $id=uuid();saveRecord($pdo,'contact_submissions',$id,['name'=>substr($name,0,190),'email'=>substr($email,0,190),'message'=>$message,'status'=>'new'],false);
        @mail($config['admin_email'],'Pesan baru dari haloglory.com',"Nama: $name\nEmail: $email\n\n$message",'From: '.$config['mail_from']."\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8");
        respond(201,['ok'=>true]);
    }

    $user=requireUser($pdo);
    if (!in_array($method,['GET','HEAD'],true)) requireCsrf($user);

    if ($path === '/dashboard/counts' && $method === 'GET') {
        $out=[];foreach(['projects','experience','blog_posts','testimonials'] as $t){$q=$pdo->prepare('SELECT COUNT(*) FROM cms_records WHERE table_name=?');$q->execute([$t]);$out[$t]=(int)$q->fetchColumn();}
        respond(200,['ok'=>true,'data'=>$out]);
    }
    if ($path === '/dashboard/recent' && $method === 'GET') {
        $limit=max(1,min(20,(int)($_GET['limit']??6)));$map=['projects'=>['Proyek','title','/admin/projects'],'blog_posts'=>['Artikel','title','/admin/blog'],'testimonials'=>['Testimoni','name','/admin/testimonials'],'experience'=>['Pengalaman','company','/admin/experience']];$items=[];
        foreach($map as $t=>$meta){$q=$pdo->prepare('SELECT * FROM cms_records WHERE table_name=? ORDER BY updated_at DESC LIMIT ?');$q->bindValue(1,$t);$q->bindValue(2,$limit,PDO::PARAM_INT);$q->execute();foreach($q as $r){$d=cleanRecord($r);$items[]=['type'=>$meta[0],'title'=>(string)($d[$meta[1]]??''),'updated_at'=>$r['updated_at'],'href'=>$meta[2]];}}
        usort($items,fn($a,$b)=>strcmp($b['updated_at'],$a['updated_at']));respond(200,['ok'=>true,'data'=>array_slice($items,0,$limit)]);
    }

    if ($path === '/media' && $method === 'GET') {
        $sql='SELECT * FROM media WHERE 1=1';$args=[];if(!empty($_GET['folder'])){$sql.=' AND folder=?';$args[]=$_GET['folder'];}if(!empty($_GET['search'])){$sql.=' AND (file_name LIKE ? OR alt_id LIKE ? OR alt_en LIKE ?)';$s='%'.$_GET['search'].'%';array_push($args,$s,$s,$s);}$sort=$_GET['sort']??'newest';$sql.=$sort==='name'?' ORDER BY file_name ASC':($sort==='oldest'?' ORDER BY created_at ASC':' ORDER BY created_at DESC');$q=$pdo->prepare($sql);$q->execute($args);respond(200,['ok'=>true,'data'=>$q->fetchAll()]);
    }
    if ($path === '/media' && $method === 'POST') {
        if (!isset($_FILES['file']) || $_FILES['file']['error']!==UPLOAD_ERR_OK) respond(422,['ok'=>false,'message'=>'Upload gagal.']);
        $file=$_FILES['file'];if($file['size']>5*1024*1024)respond(422,['ok'=>false,'message'=>'File maksimal 5 MB.']);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$exts=['image/webp'=>'webp','image/jpeg'=>'jpg','image/png'=>'png','image/avif'=>'avif'];if(!isset($exts[$mime]))respond(422,['ok'=>false,'message'=>'Tipe gambar tidak didukung.']);
        $folder=preg_replace('/[^a-z0-9_-]/','',strtolower((string)($_POST['folder']??'general')))?:'general';$name=date('YmdHis').'-'.bin2hex(random_bytes(5)).'.'.$exts[$mime];$rel='uploads/'.$folder.'/'.$name;$abs=dirname(__DIR__).'/'.$rel;if(!is_dir(dirname($abs)))mkdir(dirname($abs),0755,true);if(!move_uploaded_file($file['tmp_name'],$abs))respond(500,['ok'=>false,'message'=>'Gagal menyimpan file.']);
        $id=uuid();$public='/'.$rel;$q=$pdo->prepare('INSERT INTO media (id,file_name,storage_path,public_url,mime_type,file_size,width,height,folder) VALUES (?,?,?,?,?,?,?,?,?)');$q->execute([$id,substr((string)($file['name']??$name),0,255),$rel,$public,$mime,$file['size'],($_POST['width']??null)?:null,($_POST['height']??null)?:null,$folder]);$q=$pdo->prepare('SELECT * FROM media WHERE id=?');$q->execute([$id]);respond(201,['ok'=>true,'data'=>$q->fetch()]);
    }
    if ($path === '/media/references' && $method === 'GET') {
        $url=(string)($_GET['url']??'');$refs=[];$checks=[['projects','cover_image','Proyek (sampul)'],['project_images','url','Galeri proyek'],['blog_posts','featured_image','Artikel blog'],['testimonials','avatar','Testimoni'],['experience','company_logo','Pengalaman'],['about','hero_image','Halaman Tentang'],['homepage','hero_image','Homepage']];foreach($checks as [$t,$c,$l]){$q=$pdo->prepare('SELECT data_json FROM cms_records WHERE table_name=?');$q->execute([$t]);$n=0;foreach($q as $r){$d=json_decode($r['data_json'],true)?:[];if(($d[$c]??null)===$url)$n++;}if($n)$refs[]=['label'=>$l,'count'=>$n];}respond(200,['ok'=>true,'data'=>$refs]);
    }
    if (preg_match('#^/media/([a-f0-9-]+)$#',$path,$m)) {
        $id=$m[1];$q=$pdo->prepare('SELECT * FROM media WHERE id=?');$q->execute([$id]);$item=$q->fetch();if(!$item)respond(404,['ok'=>false,'message'=>'Media tidak ditemukan.']);
        if ($method==='PATCH'){$in=body();$allowed=array_intersect_key($in,array_flip(['alt_id','alt_en','folder']));foreach($allowed as $k=>$v){$pdo->prepare("UPDATE media SET `$k`=? WHERE id=?")->execute([$v,$id]);}respond(200,['ok'=>true]);}
        if ($method==='DELETE'){$abs=dirname(__DIR__).'/'.$item['storage_path'];if(is_file($abs))unlink($abs);$pdo->prepare('DELETE FROM media WHERE id=?')->execute([$id]);respond(200,['ok'=>true]);}
    }

    if (preg_match('#^/content/([^/]+)/slug-exists$#',$path,$m) && $method==='GET') {
        $table=tableOrFail($m[1]);$slug=(string)($_GET['slug']??'');$exclude=(string)($_GET['exclude_id']??'');$q=$pdo->prepare('SELECT * FROM cms_records WHERE table_name=?');$q->execute([$table]);$exists=false;foreach($q as $r){$d=cleanRecord($r);if(($d['slug']??null)===$slug && $d['id']!==$exclude){$exists=true;break;}}respond(200,['ok'=>true,'exists'=>$exists]);
    }
    if (preg_match('#^/content/([^/]+)(?:/([^/]+))?$#',$path,$m)) {
        $table=tableOrFail($m[1]);$id=$m[2]??null;
        if ($method==='GET' && $id===null){$q=$pdo->prepare('SELECT * FROM cms_records WHERE table_name=?');$q->execute([$table]);$rows=array_map('cleanRecord',$q->fetchAll());$filters=json_decode((string)($_GET['filters']??'{}'),true)?:[];foreach($filters as $k=>$v){if($v!==''&&$v!=='all')$rows=array_values(array_filter($rows,fn($r)=>(string)($r[$k]??'')===(string)$v));}if(!empty($_GET['search'])){$term=mb_strtolower((string)$_GET['search']);$cols=array_filter(explode(',',(string)($_GET['search_columns']??'')));$rows=array_values(array_filter($rows,function($r)use($term,$cols){foreach($cols as $c)if(str_contains(mb_strtolower((string)($r[$c]??'')),$term))return true;return false;}));}$order=(string)($_GET['order']??'');if($order){$asc=($_GET['ascending']??'true')==='true';usort($rows,fn($a,$b)=>($asc?1:-1)*(($a[$order]??'')<=>($b[$order]??'')));}if(!empty($_GET['limit']))$rows=array_slice($rows,0,max(1,(int)$_GET['limit']));respond(200,['ok'=>true,'data'=>$rows]);}
        if ($method==='GET' && $id!==null){$q=$pdo->prepare('SELECT * FROM cms_records WHERE table_name=? AND id=?');$q->execute([$table,$id]);$r=$q->fetch();respond(200,['ok'=>true,'data'=>$r?cleanRecord($r):null]);}
        if ($method==='POST' && $id===null){$in=body();$newId=(string)($in['id']??uuid());unset($in['id']);respond(201,['ok'=>true,'data'=>saveRecord($pdo,$table,$newId,$in,false)]);}
        if (in_array($method,['PATCH','PUT'],true) && $id!==null){$in=body();$q=$pdo->prepare('SELECT * FROM cms_records WHERE table_name=? AND id=?');$q->execute([$table,$id]);$old=$q->fetch();$data=$old?array_merge(cleanRecord($old),$in):$in;unset($data['id']);respond(200,['ok'=>true,'data'=>saveRecord($pdo,$table,$id,$data,true)]);}
        if ($method==='DELETE' && $id!==null){$pdo->prepare('DELETE FROM cms_records WHERE table_name=? AND id=?')->execute([$table,$id]);respond(200,['ok'=>true]);}
    }
    respond(404,['ok'=>false,'message'=>'Endpoint tidak ditemukan.']);
} catch (PDOException $e) {
    error_log('MGL API database error: '.$e->getMessage());
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(500,['ok'=>false,'message'=>'Terjadi kesalahan database.']);
} catch (Throwable $e) {
    error_log('MGL API error: '.$e->getMessage());
    respond(500,['ok'=>false,'message'=>'Terjadi kesalahan server.']);
}
