import assert from 'node:assert/strict';
import { z } from 'zod';
import type { EmailProviderBase, EventSource } from '@tryghost/adapter-base-email';
import adapterManager from '../adapter-manager';
import config from '../../../shared/config';
import { EmailEventService } from './event-service';
import { ProcessEmailEventsJob } from './process-email-events-job';
import { Queries } from '../email-analytics/lib/queries';
import type { Knex } from 'knex';
import type { JobsService } from '../jobs-service/jobs-service';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';
import logging from '@tryghost/logging';

const sourceSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
let active: EmailProviderBase | undefined;
const sources = new Map<string, EmailProviderBase>();

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

/** Boot owns construction. Retain old accounts to finish processing their events. */
export function init(): void {
  if (active) {
    return;
  }
  const provider = adapterManager.getAdapter('email');
  const retained = z.array(sourceSchema).parse(config.get('emailProvider:retainedSources') ?? []);
  const all = [provider, ...retained.map((name) => adapterManager.getAdapter(`email:${name}`))];
  const nextSources = new Map<string, EmailProviderBase>();
  for (const entry of all) {
    validateProvider(entry);
    assert(!nextSources.has(entry.source), `Duplicate email provider source: ${entry.source}`);
    nextSources.set(entry.source, entry);
  }
  sources.clear();
  for (const [id, entry] of nextSources) {
    sources.set(id, entry);
  }
  active = provider;
}

export function getProvider(): EmailProviderBase {
  assert(active, 'Email provider must be initialized at boot');
  return active;
}

export function getSource(source: string): EmailProviderBase | undefined {
  return sources.get(source);
}

export function getSources(): readonly EmailProviderBase[] {
  assert(active, 'Email provider must be initialized at boot');
  return [...sources.values()];
}

let eventService: EmailEventService | undefined;
export function initEvents({
  knex,
  jobsService,
  gifts,
}: {
  knex: Knex;
  jobsService: JobsService;
  gifts: GiftDeliveryService;
}): void {
  if (eventService) {
    return;
  }
  eventService = new EmailEventService({
    knex,
    gifts,
    getSource,
    queries: new Queries(knex),
    wake: () => jobsService.dispatch(new ProcessEmailEventsJob()),
    logError: (error) => logging.error(error),
  });
}
export function getEventService(): EmailEventService {
  assert(eventService, 'Email event service must be initialized at boot');
  return eventService;
}
