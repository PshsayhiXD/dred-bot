import express from 'express';
import paths from './../../utils/path.js';
export default ({ writeEnv, readEnv, readText, log }) => {
  const router = express.Router();
  router.get('/spotify_auth', async (req, res) => {
    const CLIENT_ID = await readEnv('SPOTIFY_CLIENT_ID');
    const REDIRECT_URI = 'http://127.0.0.1:3000/spotify_callback';
    const SCOPES = ['user-read-private', 'user-read-email'];
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    res.redirect(authUrl.toString());
  });
  router.get('/spotify_callback', async (req, res) => {
    const code = req.query.code;
    const CLIENT_ID = await readEnv('SPOTIFY_CLIENT_ID');
    const CLIENT_SECRET = await readEnv('SPOTIFY_CLIENT_ID_SECRET');
    const REDIRECT_URI = 'http://127.0.0.1:3000/spotify_callback';
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        const obtainedAt = Date.now();
        await writeEnv('SPOTIFY_ACCESS_TOKEN', data.access_token);
        await writeEnv('SPOTIFY_REFRESH_TOKEN', data.refresh_token);
        await writeEnv('SPOTIFY_EXPIRES_IN', String(data.expires_in));
        await writeEnv('SPOTIFY_OBTAINED_AT', String(obtainedAt));
        let html = await readText(paths.html.spotify_callback);
        html = html
          .replace('{{access_token}}', data.access_token)
          .replace('{{refresh_token}}', data.refresh_token)
          .replace('{{expires_in}}', data.expires_in)
          .replace('{{obtained_at}}', obtainedAt);
        res.set('Content-Type', 'text/html').send(html);
      } else res.status(400).send(`[404] Failed to get token: ${JSON.stringify(data)}`);
    } catch (err) {
      log(`[-] /spotify err: ${err}`, 'error')
      res.status(500).send('[500] Error exchanging token: ' + err.message);
    }
  });

  return router;
};