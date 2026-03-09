# DayForge — Daily OS

Your personal daily operating system with finance tracking (Teller), fitness (Strava), food scanning (Claude AI), and more.

---

## Deploy to Vercel via GitHub

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dayforge
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Under **Environment Variables**, add all required keys (see below)
4. Click **Deploy**

### 3. Environment Variables (add all that apply)
| Variable | Description |
|---|---|
| `CLAUDE_API_KEY` | Anthropic API key (for food scanning) |
| `STRAVA_CLIENT_ID` | Strava OAuth app client ID |
| `STRAVA_CLIENT_SECRET` | Strava OAuth app client secret |

### 4. Custom domain (dayforge.site)
1. Vercel → project → **Settings → Domains** → add `dayforge.site`
2. Update DNS:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`

---

## API Endpoints
- `GET /` — Serves the app with `STRAVA_CLIENT_ID` injected
- `POST /api/strava-auth` — Strava OAuth exchange & token refresh
- `POST /api/teller-transactions` — Fetch bank transactions via Teller
- `POST /api/scan-food` — AI food photo analysis via Claude

---

## Strava Setup
1. Create an app at [strava.com/settings/api](https://www.strava.com/settings/api)
2. Set **Authorization Callback Domain** to `dayforge.site`
3. Copy **Client ID** and **Client Secret** into Vercel env vars

## Teller Setup
The Teller certificate and private key are embedded in `api/teller-transactions.js`. To rotate them, replace the `TELLER_CERT` and `TELLER_KEY` values with your new credentials from the Teller dashboard.
