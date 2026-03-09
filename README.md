# DayForge v3 — Personal Daily OS

Self-improvement focused daily planner with:
- 📓 Morning & Evening Journals (per-day, browsable history)
- 🎯 Goals & Day Planner (hourly calendar like Notion Calendar)
- 📅 Google Calendar integration (import meetings/events)
- 🥗 Nutrition tracking with AI food scanning
- 💪 Fitness tracking with Strava integration + Apple Health

## Vercel Environment Variables

| Variable | Description |
|---|---|
| `CLAUDE_API_KEY` | Anthropic API key for food scanning |
| `STRAVA_CLIENT_ID` | Strava OAuth app client ID |
| `STRAVA_CLIENT_SECRET` | Strava OAuth app client secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Calendar sync |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret for Calendar sync |
| `GOOGLE_REDIRECT_URI` | Set to `https://dayforge.site/api/gcal-callback` |

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://dayforge.site/api/gcal-callback`
5. Copy Client ID and Client Secret to Vercel env vars

## Project Structure

```
/api/index.js          ← Serves HTML with env vars injected
/api/strava-auth.js    ← Strava OAuth + activity sync
/api/scan-food.js      ← Claude AI food photo analysis
/api/gcal-callback.js  ← Google Calendar OAuth callback
/public/index.html     ← Main app
/vercel.json           ← Routing config
```
