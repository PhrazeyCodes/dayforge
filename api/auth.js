// api/auth.js — Google OAuth sign-in via Supabase Auth
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }).filter(([k]) => k));
}

export default async function handler(req, res) {
  const { action } = req.query;
  const origin = getOrigin(req);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // LOGIN: redirect to Google via Supabase
  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth?action=callback`,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    });
    if (error || !data?.url) return res.status(500).send('OAuth init failed: ' + (error?.message || 'no URL'));
    return res.redirect(data.url);
  }

  // CALLBACK: exchange code for session
  if (action === 'callback') {
    const { code } = req.query;
    if (!code) return res.redirect('/?auth=error&reason=no_code');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.session) return res.redirect('/?auth=error&reason=' + encodeURIComponent(error?.message || 'no_session'));
    const { access_token, refresh_token, expires_in } = data.session;
    const secure = origin.startsWith('https') ? '; Secure' : '';
    const base = `; Path=/; SameSite=Lax; HttpOnly${secure}`;
    res.setHeader('Set-Cookie', [
      `df_access=${encodeURIComponent(access_token)}${base}; Max-Age=${expires_in || 3600}`,
      `df_refresh=${encodeURIComponent(refresh_token)}${base}; Max-Age=2592000`,
    ]);
    return res.redirect('/?auth=success');
  }

  // LOGOUT
  if (action === 'logout') {
    const secure = origin.startsWith('https') ? '; Secure' : '';
    const base = `; Path=/; SameSite=Lax; HttpOnly${secure}; Max-Age=0`;
    res.setHeader('Set-Cookie', [`df_access=''${base}`, `df_refresh=''${base}`]);
    return res.redirect('/');
  }

  // ME: return current user
  if (action === 'me') {
    const cookies = parseCookies(req);
    const accessToken = cookies['df_access'];
    if (!accessToken) return res.status(401).json({ user: null });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      const refreshToken = cookies['df_refresh'];
      if (!refreshToken) return res.status(401).json({ user: null });
      const { data: rd, error: re } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (re || !rd?.session) return res.status(401).json({ user: null });
      const { access_token: na, expires_in: ei } = rd.session;
      const secure = origin.startsWith('https') ? '; Secure' : '';
      res.setHeader('Set-Cookie', [`df_access=${encodeURIComponent(na)}; Path=/; SameSite=Lax; HttpOnly${secure}; Max-Age=${ei || 3600}`]);
      const u = rd.user;
      return res.json({ user: { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email, avatar: u.user_metadata?.avatar_url || null } });
    }
    const u = data.user;
    return res.json({ user: { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email, avatar: u.user_metadata?.avatar_url || null } });
  }

  res.status(400).json({ error: 'Unknown action' });
}
