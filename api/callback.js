// GitHub OAuth — langkah 2: tukar `code` jadi access token, lalu kirim token
// kembali ke jendela Decap CMS lewat postMessage. (backend github)
export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET belum diset di Vercel.');
    return;
  }

  const { code, state } = req.query || {};
  // Verifikasi anti-CSRF: state harus cocok dengan cookie.
  const cookie = req.headers.cookie || '';
  const saved = /decap_oauth_state=([^;]+)/.exec(cookie)?.[1];
  if (!code || !state || !saved || state !== saved) {
    res.status(400).send('State tidak valid / kadaluarsa. Coba login ulang.');
    return;
  }

  const send = (status, content) => {
    const script = `
<!doctype html><html><body><script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage('authorization:github:${status}:${JSON.stringify(content)}', e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Set-Cookie', 'decap_oauth_state=; Path=/; Max-Age=0');
    res.status(200).send(script);
  };

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await tokenRes.json();
    if (data.error || !data.access_token) {
      send('error', { message: data.error_description || 'Gagal menukar token.' });
      return;
    }
    send('success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    send('error', { message: String(err && err.message ? err.message : err) });
  }
}
