const https = require('https');

const CLIENT_ID     = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(new Error('Failed to parse Strava response: ' + raw)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(path, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.strava.com',
      path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + accessToken },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(new Error('Failed to parse Strava response')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function exchangeCode(code) {
  const res = await httpsPost('www.strava.com', '/oauth/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });
  if (res.status !== 200) throw new Error(res.body.message || 'Token exchange failed');
  return res.body;
}

async function refreshToken(refreshTok) {
  const res = await httpsPost('www.strava.com', '/oauth/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshTok,
    grant_type: 'refresh_token',
  });
  if (res.status !== 200) throw new Error(res.body.message || 'Token refresh failed');
  return res.body;
}

async function fetchTodayCalories(accessToken) {
  const now = new Date();
  const startOfDay = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);

  const res = await httpsGet(
    `/api/v3/athlete/activities?after=${startOfDay}&per_page=30`,
    accessToken
  );

  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status !== 200) throw new Error('Failed to fetch activities');

  const activities = res.body;
  if (!Array.isArray(activities)) return { calories: 0, activities: [] };

  let totalCalories = 0;
  const summaries = [];

  for (const act of activities) {
    const kcal = act.calories || act.kilojoules
      ? (act.calories || Math.round((act.kilojoules || 0) / 4.184))
      : 0;
    totalCalories += kcal;
    summaries.push({
      id: act.id,
      name: act.name,
      type: act.sport_type || act.type,
      duration: Math.round((act.moving_time || 0) / 60),
      calories: kcal,
      distance: act.distance ? Math.round(act.distance / 100) / 10 : 0,
      startDate: act.start_date_local,
    });
  }

  return { calories: totalCalories, activities: summaries };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { action } = body;

  try {
    if (action === 'exchange') {
      const { code } = body;
      if (!code) return res.status(400).json({ error: 'code is required' });
      const tokens = await exchangeCode(code);
      return res.status(200).json({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    tokens.expires_at,
        athlete_name:  tokens.athlete ? `${tokens.athlete.firstname} ${tokens.athlete.lastname}`.trim() : '',
      });
    }

    if (action === 'sync') {
      let { access_token, refresh_token, expires_at } = body;
      if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required' });

      const nowSec = Math.floor(Date.now() / 1000);
      if (!access_token || (expires_at && expires_at - 60 < nowSec)) {
        const refreshed = await refreshToken(refresh_token);
        access_token  = refreshed.access_token;
        refresh_token = refreshed.refresh_token;
        expires_at    = refreshed.expires_at;
      }

      let data;
      try {
        data = await fetchTodayCalories(access_token);
      } catch (err) {
        if (err.message === 'UNAUTHORIZED') {
          const refreshed = await refreshToken(refresh_token);
          access_token  = refreshed.access_token;
          refresh_token = refreshed.refresh_token;
          expires_at    = refreshed.expires_at;
          data = await fetchTodayCalories(access_token);
        } else {
          throw err;
        }
      }

      return res.status(200).json({
        calories:      data.calories,
        activities:    data.activities,
        access_token,
        refresh_token,
        expires_at,
      });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('strava-auth error:', err.message);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
