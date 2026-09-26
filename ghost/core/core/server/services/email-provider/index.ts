import assert from 'node:assert/strict';
import { z } from 'zod';
import type { EmailProviderBase, EventSource } from '@tryghost/adapter-base-email';
import adapterManager from '../adapter-manager';

const sourceSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
let active: EmailProviderBase | undefined;

export function validateProvider(provider: EmailProviderBase): void {
  sourceSchema.parse(provider.source);
  assert.equal(provider.version, 1, 'Unsupported email provider contract version');
  const events: EventSource = provider.getEventSource();
  assert(
    events?.type === 'poll' || events?.type === 'webhook',
    'Email provider must declare an event source',
  );
  assert.equal(
    typeof (events.type === 'poll' ? events.fetch : events.verify),
    'function',
    'Email provider event source is incomplete',
  );
  assert(
    Number.isInteger(provider.getMaximumRecipients()) && provider.getMaximumRecipients() > 0,
    'Email provider recipient limit must be positive',
  );
  assert(
    Number.isFinite(provider.getTargetDeliveryWindow()) && provider.getTargetDeliveryWindow() >= 0,
    'Email provider delivery window must be non-negative',
  );
}

/** Boot owns construction of the single configured provider. */
export function init(): void {
  if (active) {
    return;
  }
  const provider = adapterManager.getAdapter('email');
  validateProvider(provider);
  active = provider;
}

export function getProvider(): EmailProviderBase {
  assert(active, 'Email provider must be initialized at boot');
  return active;
}
