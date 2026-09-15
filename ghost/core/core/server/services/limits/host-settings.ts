import type { LimitServiceInitOptions } from '../limits';

/** Ghost's configuration, narrowed to the one thing reading host settings needs of it. */
interface GhostConfig {
  get(key: string): unknown;
}

/**
 * What a host has configured, read as limits.
 *
 * Ghost(Pro) injects its side of the arrangement under the `hostSettings` key of Ghost's
 * own configuration: which limits apply, where to send someone who hits one, and when
 * their billing period started. Turning that into the service's terms happens here rather
 * than in the service, so that the service is told what its limits are instead of going to
 * look for them, and so a test can describe a host without a configuration store behind it.
 */
export function fromHostSettings(config: GhostConfig): LimitServiceInitOptions {
  const billingEnabled = config.get('hostSettings:billing:enabled') === true;
  const billingUrl = config.get('hostSettings:billing:url');

  return {
    limits: (config.get('hostSettings:limits') || {}) as LimitServiceInitOptions['limits'],
    subscription: config.get('hostSettings:subscription')
      ? { startDate: config.get('hostSettings:subscription:start') as string, interval: 'month' }
      : undefined,
    // An empty URL is no URL, so it falls back rather than leaving a refusal with nowhere
    // to send the publisher.
    helpLink:
      billingEnabled && typeof billingUrl === 'string' && billingUrl
        ? billingUrl
        : 'https://ghost.org/help/',
    db: require('../../data/db'),
  };
}
