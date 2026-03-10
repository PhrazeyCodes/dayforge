export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not set on server' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid request body' }); }
  }

  const { sex, age, heightInches, currentWeight, targetWeight, activityLevel, mode } = body;
  if (!sex || !age || !heightInches || !currentWeight || !mode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `You are a certified nutrition coach. Calculate a personalized nutrition plan.

User profile:
- Sex: ${sex}
- Age: ${age} years
- Height: ${heightInches} inches
- Current weight: ${currentWeight} lbs
- Target weight: ${targetWeight ? targetWeight + ' lbs' : 'not specified'}
- Activity level: ${activityLevel}
- Goal: ${mode}

Instructions:
1. Use Mifflin-St Jeor to calculate BMR
2. Apply activity multiplier: sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very_active=1.9
3. For "deficit": subtract 500 kcal for ~0.75 lbs/week loss (min 1200 women, 1500 men)
4. For "surplus": add 350 kcal for ~0.5 lbs/week gain
5. For "maintain": use TDEE as-is
6. Protein: deficit/maintain = 0.85g per lb bodyweight, surplus = 1.1g per lb
7. Fat: 28% of total calories
8. Carbs: remaining calories / 4
9. weeklyChange: negative for deficit (e.g. -0.75), positive for surplus (e.g. 0.5), 0 for maintain
10. advice: 2 sentences of personalized coaching specific to their numbers and goal

Respond ONLY with valid JSON, no markdown, no extra text:
{"calories":NUMBER,"protein":NUMBER,"carbs":NUMBER,"fat":NUMBER,"weeklyChange":NUMBER,"advice":"string"}`;

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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = '';
    try { text = data.content[0].text; } catch (e) { return res.status(500).json({ error: 'Unexpected Claude response' }); }

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
