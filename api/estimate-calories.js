// In-memory cache — keyed by type+duration(rounded)+weight(rounded)+sex
// Vercel warm instances will reuse this; cold starts reset it (acceptable)
const estimateCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) return res.status(500).json({ error: 'CLAUDE_API_KEY not set' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid body' }); }
  }

  const { type, name, duration, notes, weight, age, sex } = body;
  if (!type || !duration) return res.status(400).json({ error: 'Missing type or duration' });

  // ── Cache key: round duration to nearest 5 mins, weight to nearest 5 lbs ──
  const durNum  = Math.round(parseInt(duration) / 5) * 5;
  const wgtNum  = weight ? Math.round(parseFloat(weight) / 5) * 5 : 175;
  const sexKey  = sex || 'unknown';
  // Notes affect intensity so include a simplified version (presence of heavy keywords)
  const notesKey = notes
    ? (/(heavy|max|sprint|intense|hiit)/i.test(notes) ? 'intense' : 'normal')
    : 'none';
  const cacheKey = [type.toLowerCase(), durNum, wgtNum, sexKey, notesKey].join('|');

  const cached = estimateCache.get(cacheKey);
  if (cached) {
    return res.status(200).json(Object.assign({}, cached, { cached: true }));
  }

  const prompt = `You are a certified fitness coach and exercise physiologist. Estimate calories burned for this workout.

User profile:
- Weight: ${wgtNum} lbs
- Age: ${age || 'unknown (assume 30)'}
- Sex: ${sexKey}

Workout:
- Type: ${type}
- Name: ${name || type}
- Duration: ${durNum} minutes
- Notes/Exercises: ${notes || 'none provided'}

Use MET values and the formula: Calories = MET x weight_kg x duration_hours
Adjust for workout intensity based on the notes (heavier weights, faster pace = higher MET).

Respond ONLY with valid JSON, no markdown:
{"calories":NUMBER,"intensity":"low|moderate|high","met":NUMBER,"note":"one short sentence explaining the estimate"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = '';
    try { text = data.content[0].text; } catch (e) { return res.status(500).json({ error: 'Unexpected response' }); }

    text = text.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    // Store in cache, cap at 1000 entries
    estimateCache.set(cacheKey, parsed);
    if (estimateCache.size > 1000) {
      estimateCache.delete(estimateCache.keys().next().value);
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}