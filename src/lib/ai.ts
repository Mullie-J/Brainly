/**
 * AI client — calls our /api/ai proxy (Vercel serverless function).
 * The Anthropic key lives server-side as ANTHROPIC_API_KEY; the browser only
 * sends its Supabase JWT for auth. No secrets ship to the client.
 */

import { supabase } from '@/lib/supabase';

export interface NoteSummary {
  tldr: string;
  action_items: string[];
}

// AI is always "configured" from the client's perspective — the proxy decides
// whether the key is set. We show the AI button whenever Supabase is wired up.
export const isAIConfigured = true;

/**
 * Vraag Claude (via /api/ai proxy) om een TL;DR en actie-items uit de note-tekst
 * te halen. Geeft een geparste JSON met {tldr, action_items}.
 */
export async function summarizeNote(noteText: string): Promise<NoteSummary> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Niet ingelogd');

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ noteText }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error ?? '';
    } catch {
      detail = await res.text();
    }
    throw new Error(`AI proxy ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as NoteSummary;
  return {
    tldr: String(data.tldr ?? '').trim(),
    action_items: Array.isArray(data.action_items)
      ? data.action_items.map((s) => String(s).trim()).filter(Boolean)
      : [],
  };
}

/**
 * Vlakt een BlockNote-document tot platte tekst zodat we het naar Claude
 * kunnen sturen zonder JSON-ruis.
 */
export function blockNoteToText(content: unknown): string {
  if (!Array.isArray(content)) return '';

  function inline(c: any): string {
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.map(inline).join('');
    if (c?.text) return c.text;
    if (Array.isArray(c?.content)) return c.content.map(inline).join('');
    return '';
  }

  function walk(blocks: any[], depth = 0): string[] {
    const lines: string[] = [];
    for (const b of blocks) {
      const text = inline(b?.content);
      const indent = '  '.repeat(depth);
      switch (b?.type) {
        case 'heading': {
          const level = b.props?.level ?? 2;
          lines.push('\n' + '#'.repeat(level) + ' ' + text);
          break;
        }
        case 'bulletListItem':
          lines.push(`${indent}- ${text}`);
          break;
        case 'numberedListItem':
          lines.push(`${indent}1. ${text}`);
          break;
        case 'checkListItem':
          lines.push(
            `${indent}- [${b.props?.checked ? 'x' : ' '}] ${text}`
          );
          break;
        case 'quote':
          lines.push(`> ${text}`);
          break;
        case 'paragraph':
        default:
          if (text) lines.push(text);
      }
      if (Array.isArray(b?.children) && b.children.length > 0) {
        lines.push(...walk(b.children, depth + 1));
      }
    }
    return lines;
  }

  return walk(content).join('\n').trim();
}
