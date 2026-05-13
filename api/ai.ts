/**
 * Vercel serverless function — proxy naar Anthropic Messages API.
 * Anthropic key staat alleen server-side (Vercel env var ANTHROPIC_API_KEY).
 * Browser stuurt Supabase JWT mee; we valideren die voordat we Claude callen.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

interface RequestBody {
  noteText?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server misconfigured: ANTHROPIC_API_KEY missing' }, 500);
  }

  // Auth: Supabase JWT in Authorization header. We validate against Supabase
  // (server-side) by calling /auth/v1/user — Supabase returns 401 for invalid
  // tokens, so any 2xx means the user is real.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Server misconfigured: Supabase env vars missing' }, 500);
  }

  const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userCheck.ok) return json({ error: 'Unauthorized' }, 401);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const noteText = (body.noteText ?? '').toString().slice(0, 50_000);
  if (!noteText.trim()) return json({ error: 'noteText is required' }, 400);

  const prompt = `Je krijgt een notitie. Geef terug:
1. Een TL;DR van 1-2 zinnen in dezelfde taal als de notitie, zo geschreven dat de auteur het over 3 maanden nog snapt zonder de rest te lezen. Geen generieke openings-frasen.
2. Een lijst met concrete actie-items uit de notitie: alleen taken die de auteur moet doen, niet observaties of conclusies. Elk item begint met een werkwoord. Maximaal 10 items. Sla over als er geen actie-items zijn.

Antwoord ALLEEN met geldige JSON, geen markdown of uitleg, exact dit schema:
{"tldr": "...", "action_items": ["...", "..."]}

Notitie:
"""
${noteText}
"""`;

  const claudeRes = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    return json(
      { error: `Claude API ${claudeRes.status}: ${errText.slice(0, 200)}` },
      502
    );
  }

  const data = await claudeRes.json();
  const text: string = data?.content?.[0]?.text ?? '';

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: { tldr?: unknown; action_items?: unknown };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return json({ error: 'AI-antwoord was geen geldige JSON' }, 502);
  }

  return json({
    tldr: String(parsed.tldr ?? '').trim(),
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items.map((s) => String(s).trim()).filter(Boolean)
      : [],
  });
}

export const config = { runtime: 'edge' };

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
