// GitHub OAuth — langkah 1: arahkan admin ke halaman otorisasi GitHub.
// Dipakai oleh Decap CMS (backend: github, auth_endpoint: /api/auth).
// Butuh env di Vercel: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
import crypto from 'node:crypto';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GITHUB_CLIENT_ID belum diset di environment Vercel.');
    return;
  }
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;

  const state = crypto.randomBytes(16).toString('hex');
  // Simpan state di cookie untuk verifikasi anti-CSRF di callback.
  res.setHeader(
    'Set-Cookie',
    `decap_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state,
  });
  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
}
