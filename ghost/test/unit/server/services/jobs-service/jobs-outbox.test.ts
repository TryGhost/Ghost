import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import type { DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import { OutboxEnvelope } from '../../../../../core/server/services/jobs-service/jobs-outbox';

const unrouted: DispatchEnvelope = {
  version: 1,
  payload: { job: { type: 'greet', payload: '{"name":"Ada"}' } },
};

const routed: DispatchEnvelope = {
  version: 1,
  payload: { job: { type: 'greet', payload: '{"name":"Ada"}' }, routing: { queue: 'greetings' } },
};

describe('OutboxEnvelope', function () {
  describe('decode', function () {
    it('reads a stored envelope without routing', function () {
      assert.deepEqual(z.decode(OutboxEnvelope, JSON.stringify(unrouted)), unrouted);
    });

    it('reads a stored envelope with routing', function () {
      assert.deepEqual(z.decode(OutboxEnvelope, JSON.stringify(routed)), routed);
    });

    it('rejects text that is not JSON', function () {
      assert.throws(
        () => z.decode(OutboxEnvelope, '{not json'),
        /The stored jobs outbox envelope is not JSON\./,
      );
    });

    it('rejects an envelope without a job', function () {
      assert.throws(() => z.decode(OutboxEnvelope, JSON.stringify({ version: 1, payload: {} })));
    });

    it('rejects a job whose payload is not a string', function () {
      const stored = { version: 1, payload: { job: { type: 'greet', payload: { name: 'Ada' } } } };
      assert.throws(() => z.decode(OutboxEnvelope, JSON.stringify(stored)));
    });

    it('rejects a version it does not know', function () {
      assert.throws(() => z.decode(OutboxEnvelope, JSON.stringify({ ...unrouted, version: 2 })));
    });
  });

  describe('encode', function () {
    it('writes an envelope that decodes back unchanged', function () {
      assert.deepEqual(z.decode(OutboxEnvelope, z.encode(OutboxEnvelope, routed)), routed);
    });
  });
});
