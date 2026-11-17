import http from 'node:http';
import { FakeMailgunServer, type MailgunEvent } from '@/helpers/services/mailgun';
import { expect, test } from '@playwright/test';

const DOMAIN = 'fake.mailgun.test';

async function send(server: FakeMailgunServer, fields: Record<string, string | string[]>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      form.append(name, item);
    }
  }
  const response = await fetch(`http://127.0.0.1:${server.port}/v3/${DOMAIN}/messages`, {
    method: 'POST',
    body: form,
  });
  return { status: response.status, body: (await response.json()) as { id?: string } };
}

function newsletter(recipients: string[], extra: Record<string, string> = {}) {
  return {
    from: 'Site <noreply@example.com>',
    to: recipients,
    subject: 'Hello %recipient.name%',
    html: '<p>Hi</p>',
    text: 'Hi',
    'recipient-variables': JSON.stringify(
      Object.fromEntries(
        recipients.map((email) => [
          email,
          { name: email, uuid: `uuid-${email}`, message_id: `id-${email}@${DOMAIN}` },
        ]),
      ),
    ),
    'v:email-id': 'email-1',
    'o:tag': ['ghost-email', 'site-1'],
    'o:tracking-opens': 'true',
    ...extra,
  };
}

// Pages the way mailgun.js does: the last path segment of `paging.next` is the page id,
// sent back with the original query.
async function fetchAllEvents(server: FakeMailgunServer, query: Record<string, string>) {
  const base = `http://127.0.0.1:${server.port}/v3/${DOMAIN}/events`;
  const search = new URLSearchParams(query).toString();
  const events: MailgunEvent[] = [];
  let url = `${base}?${search}`;

  for (let pages = 0; pages < 100; pages++) {
    const page = (await (await fetch(url)).json()) as {
      items: MailgunEvent[];
      paging: { next: string };
    };
    if (page.items.length === 0) {
      return events;
    }
    events.push(...page.items);
    url = `${base}/${page.paging.next.split('/').pop()}?${search}`;
  }
  throw new Error('Paging did not end');
}

test.describe('Fake Mailgun - events', () => {
  let server: FakeMailgunServer;

  test.beforeEach(async () => {
    server = new FakeMailgunServer({ mailpitUrl: 'http://127.0.0.1:1' });
    await server.start();
  });

  test.afterEach(async () => {
    await server.stop();
  });

  test('records one delivered event per recipient and pages through them', async () => {
    const recipients = Array.from({ length: 7 }, (_, i) => `member${i}@example.com`);
    const begin = String(Date.now() / 1000 - 1);
    await send(server, newsletter(recipients));

    const events = await fetchAllEvents(server, {
      begin,
      limit: '3',
      ascending: 'yes',
      event: 'delivered OR opened OR failed',
      tags: 'ghost-email AND site-1',
    });

    expect(events.map((e) => e.recipient)).toEqual(recipients);
    expect(events.every((e) => e.event === 'delivered')).toBe(true);
    expect(events[0]['user-variables']).toEqual({ 'email-id': 'email-1' });
  });

  test('uses the per-recipient Message-Id template when Ghost sends one', async () => {
    const { body } = await send(server, {
      ...newsletter(['a@example.com']),
      'h:Message-Id': '<%recipient.message_id%>',
    });

    expect(body.id).toBe('<%recipient.message_id%>');
    expect(server.events[0].message.headers['message-id']).toBe(`id-a@example.com@${DOMAIN}`);
  });

  test('filters by tag, type and domain', async () => {
    await send(server, newsletter(['a@example.com']));
    const begin = String(Date.now() / 1000 - 1);

    expect(await fetchAllEvents(server, { begin, tags: 'other-site' })).toEqual([]);
    expect(await fetchAllEvents(server, { begin, event: 'opened' })).toEqual([]);
    expect(await fetchAllEvents(server, { begin, event: 'delivered' })).toHaveLength(1);
  });

  test('hides opens until their time and returns them on a later poll', async () => {
    server.configure({ openedRate: 1, minOpenDelaySeconds: 1, maxOpenDelaySeconds: 1 });
    const begin = String(Date.now() / 1000 - 1);
    await send(server, newsletter(['a@example.com']));

    expect((await fetchAllEvents(server, { begin })).map((e) => e.event)).toEqual(['delivered']);
    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });
    expect((await fetchAllEvents(server, { begin })).map((e) => e.event)).toEqual([
      'delivered',
      'opened',
    ]);
  });

  test('skips opens when open tracking is off', async () => {
    server.configure({ openedRate: 1 });
    await send(server, newsletter(['a@example.com'], { 'o:tracking-opens': '' }));

    expect(server.events.map((e) => e.event)).toEqual(['delivered']);
  });

  test('records a permanent failure instead of delivery', async () => {
    server.configure({ failedRate: 1 });
    await send(server, newsletter(['a@example.com']));

    expect(server.events).toMatchObject([
      { event: 'failed', severity: 'permanent', 'delivery-status': { code: 550 } },
    ]);
  });

  test('fails send requests at the configured rate', async () => {
    server.configure({ sendFailureRate: 1 });
    const { status } = await send(server, newsletter(['a@example.com']));

    expect(status).toBe(500);
    expect(server.messages).toHaveLength(0);
    expect(server.events).toHaveLength(0);
  });

  test('follows each tracked link with the original Host header', async () => {
    const requests: { url?: string; host?: string }[] = [];
    const site = http.createServer((req, res) => {
      requests.push({ url: req.url, host: req.headers.host });
      res.writeHead(302, { Location: 'https://example.com/' }).end();
    });
    await new Promise<void>((resolve) => {
      site.listen(0, '127.0.0.1', resolve);
    });
    const { port } = site.address() as { port: number };

    try {
      server.configure({ clickRate: 1, clickHost: '127.0.0.1' });
      await send(server, {
        ...newsletter(['a@example.com']),
        html: `<a href="http://site.test:${port}/r/1a2b3c4d?m=%recipient.uuid%&amp;x=1">Read</a>
               <a href="http://site.test:${port}/about/">Not tracked</a>`,
      });

      await expect.poll(() => server.clicks.length).toBe(1);
      expect(server.clicks[0].status).toBe(302);
      expect(requests).toEqual([
        { url: '/r/1a2b3c4d?m=uuid-a@example.com&x=1', host: `site.test:${port}` },
      ]);
    } finally {
      site.close();
    }
  });

  test('rejects unknown or invalid settings over HTTP', async () => {
    const patch = (body: unknown) =>
      fetch(`http://127.0.0.1:${server.port}/__fake/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    expect((await patch({ openedRate: 0.5 })).status).toBe(200);
    expect(server.behavior.openedRate).toBe(0.5);
    expect((await patch({ openedRate: 2 })).status).toBe(400);
    expect((await patch({ unknown: 1 })).status).toBe(400);
    expect((await patch({ minClickDelayMs: 10, maxClickDelayMs: 5 })).status).toBe(400);
  });
});
