import { describe, it, expect } from 'vitest';
import { emailEventSchema, EmailProviderBase, type EventSource } from '../src/index.ts';

class TestProvider extends EmailProviderBase {
  readonly source = 'test';
  isConfigured() {
    return true;
  }
  async send() {
    return { id: 'batch' };
  }
  async sendSingle() {
    return { id: 'single' };
  }
  getMaximumRecipients() {
    return 100;
  }
  getTargetDeliveryWindow() {
    return 0;
  }
  getEventSource(): EventSource {
    return { type: 'webhook', verify: async () => ({ events: [] }) };
  }
  async removeSuppression() {}
}

const event = {
  id: 'event-1',
  family: 'newsletters',
  type: 'delivered',
  recipientEmail: 'reader@example.com',
  providerId: '<opaque-id>',
  timestamp: '2026-09-26T10:00:00Z',
};

describe('email event contract', () => {
  it('declares sending, event and suppression requirements for the adapter manager', () => {
    const provider = new TestProvider();
    expect(provider.version).toBe(1);
    expect(provider.requiredFns).toContain('sendSingle');
    expect(provider.requiredFns).toContain('getEventSource');
    expect(provider.requiredFns).toContain('removeSuppression');
    expect(Object.isFrozen(provider.requiredFns)).toBe(true);
  });
  it('preserves opaque identifiers and parses timestamps from JSON', () => {
    const parsed = emailEventSchema.parse(event);
    expect(parsed.providerId).toBe('<opaque-id>');
    expect(parsed.timestamp).toEqual(new Date(event.timestamp));
    expect(parsed.suppress).toBe(false);
    expect(
      emailEventSchema.parse({ ...event, providerId: '', emailId: 'a'.repeat(24) }).providerId,
    ).toBe('');
  });

  it('requires explicit failure severity and does not equate rejection with suppression', () => {
    expect(emailEventSchema.safeParse({ ...event, type: 'failed' }).success).toBe(false);
    expect(
      emailEventSchema.parse({ ...event, type: 'failed', severity: 'permanent' }).suppress,
    ).toBe(false);
    expect(
      emailEventSchema.safeParse({
        ...event,
        type: 'failed',
        severity: 'temporary',
        suppress: true,
      }).success,
    ).toBe(false);
    expect(
      emailEventSchema.parse({ ...event, type: 'failed', severity: 'permanent', suppress: true })
        .suppress,
    ).toBe(true);
  });

  it.each(['josé@example.com', 'a&b@example.com', 'x=y@example.com', 'user@müller.de'])(
    'preserves events for the Ghost-supported address %s',
    (recipientEmail) => {
      for (const type of ['delivered', 'opened', 'failed', 'complained', 'unsubscribed']) {
        const parsed = emailEventSchema.parse({
          ...event,
          type,
          recipientEmail,
          ...(type === 'failed' ? { severity: 'permanent', suppress: true } : {}),
        });
        expect(parsed.recipientEmail).toBe(recipientEmail);
      }
    },
  );

  it('rejects events that cannot be safely routed or deduplicated', () => {
    for (const invalid of [
      { id: '' },
      { family: 'welcome' },
      { recipientEmail: '' },
      { recipientEmail: 'a'.repeat(192) },
      { providerId: '' },
      { timestamp: 'invalid' },
      { suppress: true },
    ]) {
      expect(emailEventSchema.safeParse({ ...event, ...invalid }).success).toBe(false);
    }
  });
});
