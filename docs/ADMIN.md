# Admin

Login: `https://haloglory.com/admin/login`.

Admin memakai session cookie `HttpOnly`, `Secure`, `SameSite=Strict`, token CSRF,
dan session server-side 12 jam. Lima kegagalan login dalam 30 menit pada email
atau IP yang sama mengunci akses sampai jendela 30 menit berakhir.

## Buat atau reset password

Pilih **Buat / reset password** di halaman login. Respons tidak membocorkan
apakah email terdaftar. Link yang dikirim ke `info@haloglory.com` hanya bisa
dipakai sekali dan kedaluwarsa setelah 30 menit. Mengganti password menghapus
semua session lama.

## File penting

- `src/lib/api.ts`: client same-origin dan CSRF.
- `src/lib/auth.ts`: login/session/reset helpers.
- `public/api/index.php`: autentikasi, CRUD, media, form kontak, dan export build.
- `src/pages/admin/`: UI admin statis.

Templates hanya merupakan link eksternal ke `mglwebkits.com`; tidak ada page
atau collection Templates di admin.
