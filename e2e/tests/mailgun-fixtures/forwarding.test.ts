import express from 'express';
import { FakeMailgunServer } from '@/helpers/services/mailgun/fake-mailgun-server';
import { FakeServer } from '@/helpers/services/fake-server';
import { expect, test } from '@playwright/test';

interface ForwardedMessage {
  To: { Email: string }[];
  ReplyTo: { Name: string; Email: string }[];
  Headers: Record<string, string>;
}

class MailpitReceiver extends FakeServer {
  readonly messages: ForwardedMessage[] = [];

  constructor() {
    super({ debugNamespace: 'e2e:mailpit-receiver' });
  }

  protected setupRoutes(): void {
    this.app.use(express.json());
    this.app.post('/api/v1/send', (req, res) => {
      this.messages.push(req.body);
      res.sendStatus(200);
    });
  }
}

test('personalizes forwarded headers separately for each recipient', async () => {
  const mailpit = new MailpitReceiver();
  await mailpit.start();
  const mailgun = new FakeMailgunServer({ mailpitUrl: `http://127.0.0.1:${mailpit.port}` });

  try {
    await mailgun.start();
    const form = new FormData();
    form.set('from', 'Newsletter <newsletter@example.test>');
    form.set('to', 'alice@example.test,bob@example.test');
    form.set('subject', 'Newsletter');
    form.set('text', 'Hello');
    form.set('h:List-Unsubscribe', '<%recipient.list_unsubscribe%>');
    form.set('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
    form.set('h:Reply-To', '%recipient.name% <replies@example.test>');
    form.set(
      'recipient-variables',
      JSON.stringify({
        'alice@example.test': {
          name: 'Alice',
          list_unsubscribe: 'https://example.test/unsubscribe/alice',
        },
        'bob@example.test': {
          name: 'Bob',
          list_unsubscribe: 'https://example.test/unsubscribe/bob',
        },
      }),
    );

    const response = await fetch(`http://127.0.0.1:${mailgun.port}/v3/example.test/messages`, {
      method: 'POST',
      body: form,
    });
    expect(response.status).toBe(200);
    await expect.poll(() => mailpit.messages.length).toBe(2);
    expect(mailpit.messages).toMatchObject([
      {
        To: [{ Email: 'alice@example.test' }],
        ReplyTo: [{ Name: 'Alice', Email: 'replies@example.test' }],
        Headers: {
          'List-Unsubscribe': '<https://example.test/unsubscribe/alice>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
      {
        To: [{ Email: 'bob@example.test' }],
        ReplyTo: [{ Name: 'Bob', Email: 'replies@example.test' }],
        Headers: {
          'List-Unsubscribe': '<https://example.test/unsubscribe/bob>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
    ]);
  } finally {
    await mailgun.stop();
    await mailpit.stop();
  }
});
