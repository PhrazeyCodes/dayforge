export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY environment variable is not set on the server' });
  }
  if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
    return res.status(500).json({ error: 'API key format looks wrong. It should start with sk-ant- (first 10 chars: ' + CLAUDE_API_KEY.substring(0, 10) + ')' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (e) { return res.status(400).json({ error: 'Invalid request body' }); }
  }

  const { imageBase64, imageType } = body;
  if (!imageBase64 || !imageType) {
    return res.status(400).json({ error: 'Missing imageBase64 or imageType' });
  }

  const prompt = `You are a nutrition expert. Analyze this food photo and identify every distinct food item visible.

For each item, estimate the macros for a typical serving size of what is shown.

Respond ONLY with valid JSON in this exact format, no extra text:
{"items":[{"name":"Food Name","cal":000,"p":00,"c":00,"f":00}]}

Rules:
- cal = calories (integer)
- p = protein in grams (integer)
- c = carbohydrates in grams (integer)
- f = fat in grams (integer)
- Be specific with food names (e.g. "Grilled Chicken Breast" not just "Chicken")
- If you cannot identify any food, return {"items":[]}
- Only return the JSON object, nothing else`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageType, data: imageBase64 }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    let text = '';
    try {
      text = data.content[0].text;
    } catch (e) {
      return res.status(500).json({ error: 'Unexpected response from Claude' });
    }

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'AI returned invalid JSON. Try again.' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
