/**
 * Shared Claude API utility for SocialGo AI features.
 * Uses raw HTTP (no SDK) to keep dependencies minimal.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

interface ClaudeOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(options: ClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

/** Extract JSON from a Claude text response (handles markdown code fences) */
export function extractJSON<T = unknown>(text: string): T {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1].trim());
}
