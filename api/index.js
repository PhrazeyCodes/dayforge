import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    const htmlPath = join(__dirname, '..', 'public', '_index.html');
    let html = readFileSync(htmlPath, 'utf8');

    const envScript = `<script>
window.SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL || '')};
window.SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')};
window.STRAVA_CLIENT_ID = ${JSON.stringify(process.env.STRAVA_CLIENT_ID || '')};
</script>`;
    html = html.replace('</head>', envScript + '\n</head>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('Server error: ' + err.message);
  }
}
