import type { IncomingMessage, ServerResponse } from 'http';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }

  const prompt = `You are a professional Chinese business translator. Break down the following English business text into logical segments and provide:

1. Professional Chinese translation (Simplified Chinese)
2. Accurate Hanyu Pinyin with tone marks
3. Brief business context explanations for key terms

Format your response as a JSON array with this structure:
[
  {
    "english": "original English segment",
    "chinese": "Chinese translation",
    "pinyin": "pinyin with tone marks", 
    "notes": "explanation of business terms and context"
  }
]

Text to translate: "${text}"

Focus on:
- Business terminology accuracy
- Professional tone in Chinese
- Clear pinyin pronunciation guide
- Practical explanations for non-native speakers

Respond only with valid JSON.`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a professional Chinese business translator specializing in workplace communication.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json().catch(() => ({}));
      return res.status(500).json({ error: errorData.error?.message || 'OpenAI API error' });
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No translation content received from OpenAI' });
    }
    let segments;
    try {
      segments = JSON.parse(content);
      if (!Array.isArray(segments)) throw new Error('Invalid response format');
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse translation response' });
    }
    return res.status(200).json(segments);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
} 