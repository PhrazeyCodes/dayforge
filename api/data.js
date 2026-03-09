// api/data.js — read/write user DayForge state to Supabase
// GET  /api/data  → load user state
// POST /api/data  → save user state

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }).filter(([k]) => k));
}

async function getUserFromToken(accessToken) {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await anonClient.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  const cookies = parseCookies(req);
  const accessToken = cookies['df_access'];
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const user = await getUserFromToken(accessToken);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  // Use service key for DB operations (bypasses RLS for server-side)
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── GET: load user state ──
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('user_data')
      .select('state')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      return res.status(500).json({ error: error.message });
    }

    return res.json({ state: data?.state || null });
  }

  // ── POST: save user state ──
  if (req.method === 'POST') {
    let body = '';
    await new Promise(resolve => {
      req.on('data', chunk => { body += chunk; });
      req.on('end', resolve);
    });

    let state;
    try { state = JSON.parse(body).state; }
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }

    const { error } = await db
      .from('user_data')
      .upsert({ user_id: user.id, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
