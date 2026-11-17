import busboy from 'busboy';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { FakeServer } from '@/helpers/services/fake-server';
import { z } from 'zod';

export interface SentMessage {
  id: string;
  domain: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  recipientVariables: Record<string, Record<string, string>>;
  headers: Record<string, string>;
  options: Record<string, string>;
  customVars: Record<string, string>;
  tags: string[];
  timestamp: Date;
}

export type MailgunEventType = 'delivered' | 'opened' | 'failed' | 'unsubscribed' | 'complained';

export interface MailgunEvent {
  id: string;
  event: MailgunEventType;
  /** Unix time in seconds, as Mailgun reports it */
  timestamp: number;
  recipient: string;
  tags: string[];
  'user-variables': Record<string, string>;
  message: { headers: { 'message-id': string } };
  severity?: 'permanent' | 'temporary';
  reason?: string;
  'delivery-status'?: { code: number; message: string; 'enhanced-code'?: string };
}

export interface SimulatedClick {
  url: string;
  status?: number;
  error?: string;
}

const rate = z.number().min(0).max(1);
const duration = z.number().int().min(0);

const behaviorSchema = z
  .object({
    minResponseDelayMs: duration,
    maxResponseDelayMs: duration,
    /** Chance that a send request fails with a 500 */
    sendFailureRate: rate,
    /** Chance that a recipient gets a permanent `failed` event instead of `delivered` */
    failedRate: rate,
    /** Chance that a delivered recipient opens the email, when open tracking is on */
    openedRate: rate,
    minOpenDelaySeconds: duration,
    maxOpenDelaySeconds: duration,
    /** Chance that a delivered recipient follows each tracked `/r/` link */
    clickRate: rate,
    minClickDelayMs: duration,
    maxClickDelayMs: duration,
    clickConcurrency: z.number().int().min(1),
    /** Connect to this host for clicks but keep the link's Host header, e.g. host.docker.internal */
    clickHost: z.string(),
    eventRetentionHours: z.number().positive(),
  })
  .strict();

export type FakeMailgunBehavior = z.infer<typeof behaviorSchema>;

// Deterministic by default so browser tests don't flake; the dev lane opts into realism.
export const DEFAULT_BEHAVIOR: Readonly<FakeMailgunBehavior> = Object.freeze({
  minResponseDelayMs: 0,
  maxResponseDelayMs: 0,
  sendFailureRate: 0,
  failedRate: 0,
  openedRate: 0,
  minOpenDelaySeconds: 0,
  maxOpenDelaySeconds: 0,
  clickRate: 0,
  minClickDelayMs: 0,
  maxClickDelayMs: 0,
  clickConcurrency: 4,
  clickHost: '',
  eventRetentionHours: 72,
});

const behaviorKeys = Object.keys(DEFAULT_BEHAVIOR) as (keyof FakeMailgunBehavior)[];

/** Reads `FAKE_MAILGUN_OPENED_RATE`-style variables for each behavior key */
export function behaviorFromEnv(env: NodeJS.ProcessEnv): Partial<FakeMailgunBehavior> {
  const input: Record<string, unknown> = {};

  for (const key of behaviorKeys) {
    const value = env[`FAKE_MAILGUN_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`];
    if (value !== undefined && value !== '') {
      input[key] = typeof DEFAULT_BEHAVIOR[key] === 'number' ? Number(value) : value;
    }
  }

  return behaviorSchema.partial().parse(input);
}

interface StoredEvent {
  seq: number;
  domain: string;
  event: MailgunEvent;
}

interface Cursor {
  timestamp: number;
  seq: number;
}

interface MailPitAddress {
  Name: string;
  Email: string;
}

interface MailPitSendRequest {
  From: MailPitAddress;
  To: MailPitAddress[];
  Subject: string;
  HTML: string;
  Text: string;
  ReplyTo?: MailPitAddress[];
  Headers?: Record<string, string>;
}

const MAX_PAGE_SIZE = 300;
const MAX_RECORDED_CLICKS = 1000;

export class FakeMailgunServer extends FakeServer {
  private readonly _messages: SentMessage[] = [];
  // Sorted by (timestamp, seq) so paging can binary-search and resume from a cursor
  private readonly _events: StoredEvent[] = [];
  private nextSeq = 0;
  private readonly _clicks: SimulatedClick[] = [];
  private readonly clickTimers = new Set<NodeJS.Timeout>();
  private readonly clickQueue: string[] = [];
  private activeClicks = 0;
  private readonly mailpitUrl: string;
  private _behavior: FakeMailgunBehavior;

  constructor(
    options: { port?: number; mailpitUrl?: string; behavior?: Partial<FakeMailgunBehavior> } = {},
  ) {
    super({ port: options.port, debugNamespace: 'e2e:fake-mailgun' });
    this.mailpitUrl = options.mailpitUrl ?? 'http://localhost:8025';
    this._behavior = { ...DEFAULT_BEHAVIOR };
    this.configure(options.behavior ?? {});
  }

  get messages(): SentMessage[] {
    return [...this._messages];
  }

  get events(): MailgunEvent[] {
    return this._events.map((stored) => stored.event);
  }

  get clicks(): SimulatedClick[] {
    return [...this._clicks];
  }

  get behavior(): FakeMailgunBehavior {
    return { ...this._behavior };
  }

  configure(patch: Partial<FakeMailgunBehavior>): FakeMailgunBehavior {
    const next = { ...this._behavior, ...behaviorSchema.partial().parse(patch) };

    for (const [min, max] of [
      ['minResponseDelayMs', 'maxResponseDelayMs'],
      ['minOpenDelaySeconds', 'maxOpenDelaySeconds'],
      ['minClickDelayMs', 'maxClickDelayMs'],
    ] as const) {
      if (next[min] > next[max]) {
        throw new Error(`${min} must not exceed ${max}`);
      }
    }

    this._behavior = next;
    return this.behavior;
  }

  clearMessages(): void {
    this._messages.length = 0;
  }

  /** Records an event as if Mailgun produced it, e.g. a complaint for a test to process */
  addEvent(
    event: Pick<MailgunEvent, 'event' | 'recipient'> & Partial<MailgunEvent>,
    domain = 'fake.mailgun.test',
  ): MailgunEvent {
    const stored: MailgunEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now() / 1000,
      tags: ['ghost-email'],
      'user-variables': {},
      message: { headers: { 'message-id': '' } },
      ...event,
    };
    this.insertEvent(domain, stored);
    return stored;
  }

  reset(): void {
    this.clearMessages();
    this._events.length = 0;
    this._clicks.length = 0;
    this.cancelClicks();
  }

  async stop(): Promise<void> {
    this.cancelClicks();
    await super.stop();
  }

  protected setupRoutes(): void {
    this.app.post('/v3/:domain/messages', (req, res) => {
      this.handleSendMessage(req, res);
    });

    this.app.delete('/v3/:domain/suppressions/:type/:email', (req, res) => {
      this.debug(`Suppression removal: ${req.params.type}/${req.params.email}`);
      res.status(200).json({ message: 'Suppression removed' });
    });

    this.app.get('/v3/:domain/events/:page?', (req, res) => {
      const body = this.listEvents(req);
      this.respondLater(() => res.status(200).json(body));
    });

    this.app.get('/__fake/config', (_req, res) => {
      res.status(200).json(this.behavior);
    });

    this.app.patch('/__fake/config', express.json(), (req, res) => {
      try {
        res.status(200).json(this.configure(req.body as Partial<FakeMailgunBehavior>));
      } catch (err) {
        res.status(400).json({ message: err instanceof Error ? err.message : String(err) });
      }
    });

    this.app.post('/__fake/reset', (_req, res) => {
      this.reset();
      res.status(200).json({ message: 'Reset' });
    });

    this.app.use((req, res) => {
      this.debug(`Unhandled route: ${req.method} ${req.originalUrl}`);
      res.status(200).json({ message: 'OK' });
    });
  }

  private respondLater(respond: () => void): void {
    const { minResponseDelayMs, maxResponseDelayMs } = this._behavior;
    const delay = randomBetween(minResponseDelayMs, maxResponseDelayMs);
    if (delay > 0) {
      setTimeout(respond, delay);
    } else {
      respond();
    }
  }

  private handleSendMessage(req: express.Request, res: express.Response): void {
    const domain = req.params.domain;
    const fields: Record<string, string | string[]> = {};

    const bb = busboy({ headers: req.headers });

    bb.on('field', (name: string, val: string) => {
      if (name in fields) {
        const existing = fields[name];
        if (Array.isArray(existing)) {
          existing.push(val);
        } else {
          fields[name] = [existing, val];
        }
      } else {
        fields[name] = val;
      }
    });

    bb.on('close', () => {
      if (Math.random() < this._behavior.sendFailureRate) {
        this.debug('Failing send request on purpose');
        this.respondLater(() => res.status(500).json({ message: 'API temporarily unavailable' }));
        return;
      }

      const toField = fields.to;
      const toArray = Array.isArray(toField)
        ? toField
        : typeof toField === 'string'
          ? toField.split(',').map((e) => e.trim())
          : [];

      let recipientVariables: Record<string, Record<string, string>> = {};
      try {
        const rvField = fields['recipient-variables'];
        if (typeof rvField === 'string' && rvField) {
          recipientVariables = JSON.parse(rvField);
        }
      } catch {
        this.debug('Failed to parse recipient-variables');
      }

      const headers: Record<string, string> = {};
      const options: Record<string, string> = {};
      const customVars: Record<string, string> = {};

      for (const [key, value] of Object.entries(fields)) {
        const strValue = Array.isArray(value) ? value.join(', ') : value;
        if (key.startsWith('h:')) {
          headers[key.slice(2)] = strValue;
        } else if (key.startsWith('o:')) {
          options[key.slice(2)] = strValue;
        } else if (key.startsWith('v:')) {
          customVars[key.slice(2)] = strValue;
        }
      }

      const tagField = fields['o:tag'];
      const tags = Array.isArray(tagField) ? tagField : tagField ? [tagField] : [];

      // Mailgun echoes a caller-supplied Message-Id, even an unsubstituted template
      const messageId = headers['Message-Id'] ?? `<${Date.now()}.${crypto.randomUUID()}@${domain}>`;

      const message: SentMessage = {
        id: messageId,
        domain,
        from: this.getStringField(fields, 'from'),
        to: toArray,
        subject: this.getStringField(fields, 'subject'),
        html: this.getStringField(fields, 'html'),
        text: this.getStringField(fields, 'text'),
        recipientVariables,
        headers,
        options,
        customVars,
        tags,
        timestamp: new Date(),
      };

      this._messages.push(message);
      this.debug(
        `Stored message ${messageId} to ${toArray.length} recipient(s) in domain ${domain}`,
      );

      this.pruneEvents();
      this.simulateRecipients(message);

      this.forwardToMailPit(message).catch((err) => {
        this.debug('Failed to forward to MailPit:', err);
      });

      this.respondLater(() =>
        res.status(200).json({
          id: messageId,
          message: 'Queued. Thank you.',
        }),
      );
    });

    bb.on('error', (err: Error) => {
      this.debug('Busboy parse error:', err);
      res.status(400).json({ message: 'Failed to parse request' });
    });

    req.pipe(bb);
  }

  private simulateRecipients(message: SentMessage): void {
    const behavior = this._behavior;
    const now = Date.now();
    const scheduledAt = Date.parse(message.options.deliverytime ?? '');
    const deliveredAt = Number.isNaN(scheduledAt) ? now : Math.max(now, scheduledAt);
    const opensTracked = ['yes', 'true', 'htmlonly'].includes(
      (message.options['tracking-opens'] ?? '').toLowerCase(),
    );

    for (const recipient of message.to) {
      const vars = message.recipientVariables[recipient] ?? {};
      const messageId = (message.headers['Message-Id'] ?? message.id)
        .replace(/%recipient\.([^%]+)%/g, (match, name: string) => vars[name] ?? match)
        .replace(/^<|>$/g, '');
      const base = {
        recipient,
        tags: message.tags,
        'user-variables': message.customVars,
        message: { headers: { 'message-id': messageId } },
      };

      if (Math.random() < behavior.failedRate) {
        this.insertEvent(message.domain, {
          ...base,
          id: crypto.randomUUID(),
          event: 'failed',
          timestamp: deliveredAt / 1000,
          severity: 'permanent',
          reason: 'bounce',
          'delivery-status': {
            code: 550,
            message: '5.1.1 The email account that you tried to reach does not exist.',
            'enhanced-code': '5.1.1',
          },
        });
        continue;
      }

      this.insertEvent(message.domain, {
        ...base,
        id: crypto.randomUUID(),
        event: 'delivered',
        timestamp: deliveredAt / 1000,
      });

      if (opensTracked && Math.random() < behavior.openedRate) {
        // Future-dated opens stay hidden from the events API until their time comes
        const delay = randomBetween(behavior.minOpenDelaySeconds, behavior.maxOpenDelaySeconds);
        this.insertEvent(message.domain, {
          ...base,
          id: crypto.randomUUID(),
          event: 'opened',
          timestamp: deliveredAt / 1000 + delay,
        });
      }

      if (behavior.clickRate > 0) {
        const html = this.resolveRecipientVariables(message.html, vars);
        for (const link of extractTrackedLinks(html)) {
          if (Math.random() < behavior.clickRate) {
            const delay = randomBetween(behavior.minClickDelayMs, behavior.maxClickDelayMs);
            this.scheduleClick(link, deliveredAt - now + delay);
          }
        }
      }
    }
  }

  private insertEvent(domain: string, event: MailgunEvent): void {
    const index = firstIndex(this._events, (stored) => stored.event.timestamp > event.timestamp);
    this._events.splice(index, 0, { seq: (this.nextSeq += 1), domain, event });
  }

  private pruneEvents(): void {
    const cutoff = Date.now() / 1000 - this._behavior.eventRetentionHours * 3600;
    const expired = firstIndex(this._events, (stored) => stored.event.timestamp >= cutoff);
    if (expired > 0) {
      this._events.splice(0, expired);
    }
  }

  // Ghost always pages ascending; mailgun.js takes the last path segment of `paging.next` as the
  // page id and resends the original query with it.
  private listEvents(req: express.Request) {
    const domain = req.params.domain;
    const query = req.query as Record<string, string | undefined>;
    const types = query.event ? query.event.split(' OR ').map((type) => type.trim()) : null;
    const tags = query.tags ? query.tags.split(' AND ').map((tag) => tag.trim()) : [];
    const begin = query.begin ? Number(query.begin) : -Infinity;
    const end = Math.min(query.end ? Number(query.end) : Infinity, Date.now() / 1000);
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), MAX_PAGE_SIZE);
    const cursor = parsePageToken(req.params.page);

    let index = firstIndex(this._events, (stored) => stored.event.timestamp >= begin);
    if (cursor) {
      index = Math.max(
        index,
        firstIndex(
          this._events,
          (stored) =>
            stored.event.timestamp > cursor.timestamp ||
            (stored.event.timestamp === cursor.timestamp && stored.seq > cursor.seq),
        ),
      );
    }

    const items: MailgunEvent[] = [];
    let last: StoredEvent | undefined;
    for (; index < this._events.length && items.length < limit; index++) {
      const stored = this._events[index];
      if (stored.event.timestamp > end) {
        break;
      }
      last = stored;
      if (
        stored.domain === domain &&
        (!types || types.includes(stored.event.event)) &&
        tags.every((tag) => stored.event.tags.includes(tag))
      ) {
        items.push(stored.event);
      }
    }

    const nextCursor = last ? { timestamp: last.event.timestamp, seq: last.seq } : cursor;
    const pageUrl = (token: string) =>
      `${req.protocol}://${req.get('host')}/v3/${domain}/events/${token}`;

    return {
      items,
      paging: {
        first: pageUrl('start'),
        last: pageUrl('start'),
        previous: pageUrl(req.params.page ?? 'start'),
        next: pageUrl(nextCursor ? `${nextCursor.timestamp}_${nextCursor.seq}` : 'start'),
      },
    };
  }

  private scheduleClick(url: string, delayMs: number): void {
    const timer = setTimeout(() => {
      this.clickTimers.delete(timer);
      this.clickQueue.push(url);
      this.drainClicks();
    }, delayMs);
    this.clickTimers.add(timer);
  }

  private cancelClicks(): void {
    for (const timer of this.clickTimers) {
      clearTimeout(timer);
    }
    this.clickTimers.clear();
    this.clickQueue.length = 0;
  }

  private drainClicks(): void {
    while (this.activeClicks < this._behavior.clickConcurrency && this.clickQueue.length > 0) {
      const url = this.clickQueue.shift() as string;
      this.activeClicks += 1;
      void this.click(url).finally(() => {
        this.activeClicks -= 1;
        this.drainClicks();
      });
    }
  }

  private async click(link: string): Promise<void> {
    const url = new URL(link);
    const record: SimulatedClick = { url: link };

    await new Promise<void>((resolve) => {
      const client = url.protocol === 'https:' ? https : http;
      // Plain http.request so the Host header can differ from the host we connect to
      const req = client.request(
        {
          host: this._behavior.clickHost || url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          servername: url.hostname,
          headers: { Host: url.host, 'User-Agent': 'Mozilla/5.0 (fake-mailgun click)' },
          timeout: 10_000,
        },
        (response) => {
          response.resume();
          record.status = response.statusCode;
          resolve();
        },
      );
      req.on('timeout', () => req.destroy(new Error('Timed out')));
      req.on('error', (err) => {
        record.error = err.message;
        resolve();
      });
      req.end();
    });

    this.debug(`Simulated click ${link}: ${record.status ?? record.error}`);
    this._clicks.push(record);
    if (this._clicks.length > MAX_RECORDED_CLICKS) {
      this._clicks.shift();
    }
  }

  private async forwardToMailPit(message: SentMessage): Promise<void> {
    const fromParsed = this.parseEmailAddress(message.from);

    for (const recipientEmail of message.to) {
      const recipientVars = message.recipientVariables[recipientEmail] || {};
      const personalizedHtml = this.resolveRecipientVariables(message.html, recipientVars);
      const personalizedText = this.resolveRecipientVariables(message.text, recipientVars);
      const personalizedSubject = this.resolveRecipientVariables(message.subject, recipientVars);

      // MailPit rejects reserved headers (Reply-To, Sender, etc.) in the
      // generic Headers map — extract them to dedicated fields instead.
      const reservedHeaders = new Set(['Reply-To', 'Sender', 'From', 'To', 'Subject', 'Date']);
      const filteredHeaders: Record<string, string> = {
        'X-Mailgun-Message-Id': this.resolveRecipientVariables(message.id, recipientVars),
      };
      const replyToAddresses: MailPitAddress[] = [];

      for (const [key, rawValue] of Object.entries(message.headers)) {
        const value = this.resolveRecipientVariables(rawValue, recipientVars);
        if (key === 'Reply-To' && value) {
          replyToAddresses.push(this.parseEmailAddress(value));
        } else if (!reservedHeaders.has(key)) {
          filteredHeaders[key] = value;
        }
      }

      const mailpitPayload: MailPitSendRequest = {
        From: fromParsed,
        To: [{ Name: recipientVars.name || '', Email: recipientEmail }],
        Subject: personalizedSubject,
        HTML: personalizedHtml,
        Text: personalizedText,
        ...(replyToAddresses.length > 0 ? { ReplyTo: replyToAddresses } : {}),
        Headers: filteredHeaders,
      };

      try {
        const response = await fetch(`${this.mailpitUrl}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mailpitPayload),
        });

        if (!response.ok) {
          const responseBody = await response.text();
          this.debug(
            `MailPit forward failed for ${recipientEmail}: ${response.status} ${responseBody}`,
          );
        } else {
          this.debug(`Forwarded email to MailPit for ${recipientEmail}`);
        }
      } catch (err) {
        this.debug(`MailPit forward error for ${recipientEmail}:`, err);
      }
    }
  }

  private resolveRecipientVariables(content: string, variables: Record<string, string>): string {
    if (!content) {
      return content;
    }

    return content.replace(/%recipient\.([^%]+)%/g, (_match, varName: string) => {
      return variables[varName] ?? `%recipient.${varName}%`;
    });
  }

  private parseEmailAddress(address: string): MailPitAddress {
    const match = address.match(/^([^<]+)<([^>]+)>$/);
    if (match) {
      return { Name: match[1].trim(), Email: match[2].trim() };
    }

    return { Name: '', Email: address.trim() };
  }

  private getStringField(fields: Record<string, string | string[]>, key: string): string {
    const value = fields[key];
    if (Array.isArray(value)) {
      return value[0] || '';
    }

    return value || '';
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Index of the first item matching a predicate that is false for a prefix and true after it */
function firstIndex<T>(items: T[], matches: (item: T) => boolean): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (matches(items[mid])) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

function parsePageToken(token: string | undefined): Cursor | null {
  const match = token?.match(/^(-?[\d.]+)_(\d+)$/);
  return match ? { timestamp: Number(match[1]), seq: Number(match[2]) } : null;
}

/** Ghost's member-specific redirect links, e.g. https://site/r/1a2b3c4d?m=<uuid> */
function extractTrackedLinks(html: string): string[] {
  const links = new Set<string>();
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    const link = href.replace(/&amp;/g, '&');
    try {
      const url = new URL(link);
      if (/\/r\/[0-9a-f]+\/?$/.test(url.pathname) && url.searchParams.has('m')) {
        links.add(link);
      }
    } catch {
      // not an absolute URL
    }
  }
  return [...links];
}
