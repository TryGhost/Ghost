import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import sinon from 'sinon';
import type { Request, Response } from 'express';
import { emailWebhookController } from '../../../../../core/server/services/email-provider/webhook-controller';

describe('email webhook controller', () => {
  it('passes original bytes and headers through and waits for processing to finish', async () => {
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

  it('passes verification or processing failures to the webhook error handler', async () => {
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

  for (const body of [{}, undefined, null]) {
    it(`passes empty bytes to signature verification for an empty body (${JSON.stringify(body)})`, async () => {
      const signature = createHmac('sha256', 'secret').update(Buffer.alloc(0)).digest('hex');
      const webhook = sinon.stub().callsFake(async (_source, request) => {
        assert(Buffer.isBuffer(request.body));
        assert.equal(
          createHmac('sha256', 'secret').update(request.body).digest('hex'),
          request.headers.signature,
        );
        return { events: [] };
      });
      const res = { sendStatus: sinon.stub() } as unknown as Response;
      const next = sinon.stub();

      await emailWebhookController({ webhook })(
        {
          params: { source: 'provider-account' },
          headers: { signature },
          body,
        } as unknown as Request,
        res,
        next,
      );

      sinon.assert.calledOnceWithExactly(res.sendStatus as sinon.SinonStub, 200);
      sinon.assert.notCalled(next);
    });
  }

  it('rejects a nonempty parsed body rather than verifying it as empty bytes', async () => {
    const webhook = sinon.stub();
    const res = { sendStatus: sinon.stub() } as unknown as Response;
    const next = sinon.stub();

    await emailWebhookController({ webhook })(
      {
        params: { source: 'provider-account' },
        body: { event: 'delivered' },
      } as unknown as Request,
      res,
      next,
    );

    sinon.assert.calledOnceWithMatch(next, { statusCode: 400 });
    sinon.assert.notCalled(webhook);
    sinon.assert.notCalled(res.sendStatus as sinon.SinonStub);
  });
});
