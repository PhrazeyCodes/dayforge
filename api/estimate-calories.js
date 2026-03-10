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

  const prompt = `You are a certified fitness coach and exercise physiologist. Estimate calories burned for this workout.

User profile:
- Weight: ${weight ? weight + ' lbs' : 'unknown (assume 175 lbs)'}
- Age: ${age || 'unknown (assume 30)'}
- Sex: ${sex || 'unknown (assume male)'}

Workout:
- Type: ${type}
- Name: ${name || type}
- Duration: ${duration} minutes
- Notes/Exercises: ${notes || 'none provided'}

Use MET values and the formula: Calories = MET × weight_kg × duration_hours
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
        max_tokens: 256,
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

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
