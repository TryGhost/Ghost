import { z } from 'zod';

/*
 * The DocsBot client. Questions go to DocsBot's chat agent API
 * (https://docsbot.ai/documentation/developer/chat-agent), whose bot is
 * trained on the help center (ghost.org/help), and the answer streams back as
 * server-sent events: the searches the agent runs, the answer token by token,
 * then the final answer with the help center pages it drew on.
 *
 * DocsBot keeps the conversation: each request carries a conversation id the
 * browser makes up, and the same id continues the thread, so follow-ups
 * ("and how do I customise it?") need no history from Admin.
 */

// PROTOTYPE: a test team and bot, hardcoded. Move them into Ghost config (and
// decide whether questions should go through Ghost(Pro) rather than straight
// from the browser) before anyone outside the team sees it.
export const DOCSBOT_TEAM_ID = 'HQWGXatyyGbuBqc5JOuT';
export const DOCSBOT_BOT_ID = 'iUM7pu7wtd6BMYxBwpQU';
const DOCSBOT_API_URL = `https://api.docsbot.ai/teams/${DOCSBOT_TEAM_ID}/bots/${DOCSBOT_BOT_ID}/chat-agent`;

// Unauthenticated requests take questions of 2 to 500 characters
export const MAX_QUESTION_LENGTH = 500;

/** A new thread for DocsBot to keep. */
export function newConversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Older browsers and insecure origins: good enough to tell threads apart
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random % 4) + 8).toString(16);
  });
}

export interface SseEvent {
  event: string;
  data: string;
}

/**
 * One server-sent event, from the lines between two blank lines. Several
 * `data:` lines join with newlines, which is how a token that's a line break
 * arrives.
 */
export function parseSseBlock(block: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(':')) {
      continue;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      data.push(value);
    }
  }
  return data.length ? { event, data: data.join('\n') } : null;
}

/** The events in a response body, as they arrive. */
export async function* readSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const parsed = parseSseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (parsed) {
          yield parsed;
        }
        boundary = buffer.indexOf('\n\n');
      }
      if (done) {
        const parsed = parseSseBlock(buffer);
        if (parsed) {
          yield parsed;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const SourceSchema = z
  .looseObject({
    title: z.string().nullish(),
    url: z.string().nullish(),
    used: z.boolean().nullish(),
    type: z.string().nullish(),
  })
  .transform((source) => ({
    title: source.title?.trim() || source.url || 'Help center',
    url: source.url?.startsWith('https://') ? source.url : null,
    used: source.used ?? false,
  }));

export type DocsBotSource = z.output<typeof SourceSchema>;

const AnswerSchema = z.looseObject({
  answer: z.string().default(''),
  sources: z.array(z.unknown()).default([]),
  id: z.string().nullish(),
  couldAnswer: z.boolean().nullish(),
});

const ToolCallSchema = z.looseObject({
  name: z.string(),
  // A JSON string, parsed a second time
  params: z.string().nullish(),
});

const SearchParamsSchema = z.looseObject({
  query: z.union([z.array(z.string()), z.string()]).nullish(),
});

export type DocsBotEvent =
  /** The agent is searching the help center, with what */
  | { type: 'searching'; queries: string[] }
  /** The next piece of the answer */
  | { type: 'token'; text: string }
  /** The whole answer, and the pages it came from (none for a plain reply) */
  | {
      type: 'answer';
      answer: string;
      sources: DocsBotSource[];
      /** DocsBot's id for the answer, for rating it later */
      id: string | null;
      couldAnswer: boolean;
    };

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** A DocsBot event as the panel understands it, or null for ones it doesn't show (reasoning). */
export function toDocsBotEvent({ event, data }: SseEvent): DocsBotEvent | null {
  if (event === 'stream') {
    return { type: 'token', text: data };
  }
  if (event === 'tool_call') {
    const call = ToolCallSchema.safeParse(parseJson(data));
    if (!call.success || call.data.name !== 'search_documentation') {
      return null;
    }
    const params = SearchParamsSchema.safeParse(parseJson(call.data.params ?? ''));
    const query = params.success ? params.data.query : null;
    const queries = (Array.isArray(query) ? query : [query]).filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
    return { type: 'searching', queries };
  }
  if (event === 'lookup_answer' || event === 'answer') {
    const parsed = AnswerSchema.safeParse(parseJson(data));
    if (!parsed.success) {
      return null;
    }
    return {
      type: 'answer',
      answer: parsed.data.answer,
      sources: parsed.data.sources.flatMap((source) => {
        const result = SourceSchema.safeParse(source);
        return result.success ? [result.data] : [];
      }),
      id: parsed.data.id ?? null,
      couldAnswer: parsed.data.couldAnswer ?? true,
    };
  }
  return null;
}

export interface DocsBotRequest {
  conversationId: string;
  question: string;
  /** Shows in DocsBot's question logs, nothing more */
  referrer?: string;
}

/** Asks DocsBot, yielding its searches, the answer as it streams, then the whole answer. */
export async function* askDocsBot(
  { conversationId, question, referrer }: DocsBotRequest,
  signal?: AbortSignal,
): AsyncGenerator<DocsBotEvent> {
  // eslint-disable-next-line no-restricted-syntax -- DocsBot's chat agent API, not the Admin API
  const response = await fetch(DOCSBOT_API_URL, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      conversation_id: conversationId,
      question: question.slice(0, MAX_QUESTION_LENGTH),
      stream: true,
      metadata: referrer ? { referrer } : undefined,
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`DocsBot answered ${response.status}`);
  }
  for await (const event of readSseEvents(response.body)) {
    const parsed = toDocsBotEvent(event);
    if (parsed) {
      yield parsed;
    }
  }
}
