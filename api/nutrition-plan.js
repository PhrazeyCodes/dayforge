// In-memory cache for advice blurbs — keyed by a summary of the plan
// Resets on cold start (Vercel serverless), but warm instances reuse it
const adviceCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) return res.status(500).json({ error: 'CLAUDE_API_KEY not set on server' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid request body' }); }
  }

  const { sex, age, heightInches, currentWeight, targetWeight, activityLevel, mode } = body;
  if (!sex || !age || !heightInches || !currentWeight || !mode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ── Pure JS nutrition math ──────────────────────────────────────────────────

  // 1. BMR via Mifflin-St Jeor
  const weightKg = currentWeight * 0.453592;
  const heightCm = heightInches * 2.54;
  const ageNum   = parseInt(age);
  let bmr;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;
  }

  // 2. Activity multiplier -> TDEE
  const multipliers = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
  };
  const multiplier = multipliers[activityLevel] || 1.55;
  let tdee = Math.round(bmr * multiplier);

  // 3. Calorie target by goal
  let calories, weeklyChange;
  if (mode === 'deficit') {
    calories = Math.max(sex === 'female' ? 1200 : 1500, tdee - 500);
    weeklyChange = -0.75;
  } else if (mode === 'surplus') {
    calories = tdee + 350;
    weeklyChange = 0.5;
  } else {
    calories = tdee;
    weeklyChange = 0;
  }
  calories = Math.round(calories);

  // 4. Macros
  const proteinPerLb = mode === 'surplus' ? 1.1 : 0.85;
  const protein = Math.round(currentWeight * proteinPerLb);
  const fat     = Math.round((calories * 0.28) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  // ── AI advice blurb (cached) ────────────────────────────────────────────────
  // Round inputs so minor weight fluctuations don't bust the cache
  const cacheKey = [
    sex, ageNum, Math.round(heightInches), Math.round(currentWeight / 5) * 5,
    activityLevel, mode, calories
  ].join('|');

  let advice = adviceCache.get(cacheKey);

  if (!advice) {
    try {
      const prompt = `You are a nutrition coach. Write exactly 2 sentences of personalized advice for this person.

Profile: ${sex}, age ${ageNum}, ${Math.round(heightInches)}" tall, ${Math.round(currentWeight)} lbs
Goal: ${mode} — ${calories} kcal/day, ${protein}g protein, ${carbs}g carbs, ${fat}g fat
Weekly change: ${weeklyChange > 0 ? '+' : ''}${weeklyChange} lbs/week

Be specific to their numbers. No generic tips. 2 sentences only, no lists.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      advice = data?.content?.[0]?.text?.trim() || '';
      if (advice) adviceCache.set(cacheKey, advice);
      // Cap cache at 500 entries to avoid unbounded memory growth
      if (adviceCache.size > 500) {
        adviceCache.delete(adviceCache.keys().next().value);
      }
    } catch (err) {
      advice = `At ${calories} kcal/day with ${protein}g protein, you're set up for consistent progress. Stay consistent with your meals and adjust after 2 weeks based on results.`;
    }
  }

  return res.status(200).json({ calories, protein, carbs, fat, weeklyChange, advice });
}