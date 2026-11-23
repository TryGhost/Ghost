import type { Foundation } from '@tryghost/kernel/foundation';
import { createServices, type Services } from './services.ts';

/** One application: its foundation and what has been built on it. */
export interface Application {
  readonly name: string;
  readonly foundation: Foundation;
  readonly services: Services;
}

/**
 * Builds an application around a foundation. Nothing is loaded, started or read: an application
 * does only what its bootstrap then tells it to.
 */
export function createApplication({
  name,
  foundation,
}: {
  /** Names the application in errors and logs. */
  readonly name: string;
  readonly foundation: Foundation;
}): Application {
  return { name, foundation, services: createServices({ name, foundation }) };
}
