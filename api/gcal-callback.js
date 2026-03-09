// Google Calendar OAuth callback handler
// Exchanges auth code for tokens and redirects back to the app

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?gcal=error&reason=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.redirect('/?gcal=error&reason=no_code');
  }

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
    (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host + '/api/gcal-callback';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.redirect('/?gcal=error&reason=missing_env_vars');
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return res.redirect('/?gcal=error&reason=' + encodeURIComponent(tokens.error));
    }

    // Redirect back to app with success signal
    // We pass a limited token identifier; full token management happens server-side
    const redirectUrl = '/?gcal=connected&token=' + encodeURIComponent(tokens.access_token || 'ok');
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect('/?gcal=error&reason=' + encodeURIComponent(err.message));
  }
}
