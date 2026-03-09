// api/auth.js
// GET /api/auth?action=logout  → clear cookies, redirect home
// GET /api/auth?action=me      → validate token from Authorization header, return user

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const { action } = req.query;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  // LOGOUT: clear cookie and redirect
  if (action === 'logout') {
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `df_token=; Path=/; SameSite=Lax; HttpOnly${secure}; Max-Age=0`,
    ]);
    return res.redirect('/');
  }

  // ME: validate Bearer token passed from client
  if (action === 'me') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ user: null });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ user: null });

    const u = data.user;
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email,
        avatar: u.user_metadata?.avatar_url || null,
      }
    });
  }

  res.status(400).json({ error: 'Unknown action' });
}
