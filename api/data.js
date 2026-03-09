// api/data.js — read/write user DayForge state to Supabase
// GET  /api/data  → load user state
// POST /api/data  → save user state
// Token comes from Authorization: Bearer <token> header

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function getUserFromToken(token) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // GET: load user state
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('user_data')
      .select('state')
      .eq('user_id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ state: data?.state || null });
  }

  // POST: save user state
  if (req.method === 'POST') {
    let body = '';
    await new Promise(resolve => { req.on('data', c => { body += c; }); req.on('end', resolve); });
    let state;
    try { state = JSON.parse(body).state; } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    const { error } = await db
      .from('user_data')
      .upsert({ user_id: user.id, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
