import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Request, Response } from 'express';
import { emailWebhookController } from '../../../../../core/server/services/email-provider/webhook-controller';

describe('email webhook controller', () => {
  it('passes original bytes and headers through and waits for durable acceptance', async () => {
    let accept: () => void = () => {};
    const accepted = new Promise<void>((resolve) => {
      accept = resolve;
    });
    const webhook = sinon.stub().callsFake(async () => {
      await accepted;
      return { events: [] };
    });
    const req = {
      params: { source: 'provider-account' },
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from('{ "events": [] }'),
    } as unknown as Request;
    const res = { sendStatus: sinon.stub() } as unknown as Response;
    const next = sinon.stub();
    const pending = emailWebhookController({ webhook })(req, res, next);
    sinon.assert.notCalled(res.sendStatus as sinon.SinonStub);
    sinon.assert.calledOnceWithExactly(webhook, 'provider-account', {
      body: req.body,
      headers: req.headers,
    });
    accept();
    await pending;
    sinon.assert.calledOnceWithExactly(res.sendStatus as sinon.SinonStub, 200);
    sinon.assert.notCalled(next);
  });

  it('passes verification or storage failures to the webhook error handler', async () => {
    const error = new Error('Notification could not be accepted');
    const next = sinon.stub();
    const res = { sendStatus: sinon.stub() } as unknown as Response;
    await emailWebhookController({ webhook: sinon.stub().rejects(error) })(
      { params: { source: 'provider-account' } } as unknown as Request,
      res,
      next,
    );
    sinon.assert.calledOnceWithExactly(next, error);
    sinon.assert.notCalled(res.sendStatus as sinon.SinonStub);
    assert(next.called);
  });
});
