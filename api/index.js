const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID || '';
  const filePath = path.join(process.cwd(), 'public', 'index.html');

  let html;
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return res.status(500).send('Could not load app');
  }

  // Inject the Strava client ID (same as the old Netlify edge function)
  html = html.replace("'{{STRAVA_CLIENT_ID}}'", JSON.stringify(clientId));

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(html);
}
