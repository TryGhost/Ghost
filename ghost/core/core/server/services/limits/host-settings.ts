import logging from '@tryghost/logging';
import { readHostSettings } from '@tryghost/limit-service';

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
 *
 * Reading configuration can never stop a site starting. A limit nobody can read cannot be
 * applied either way, and refusing to boot over one would take a site off the air for a
 * mistake made elsewhere. What it does instead is say so, at error level, because a limit
 * that is configured, charged for and then not applied is otherwise invisible until a
 * customer exceeds it.
 */
export function fromHostSettings(config: GhostConfig): LimitServiceInitOptions {
  const billingEnabled = config.get('hostSettings:billing:enabled') === true;
  const billingUrl = config.get('hostSettings:billing:url');
  const { settings, rejected } = readHostSettings({
    limits: config.get('hostSettings:limits'),
    subscription: config.get('hostSettings:subscription'),
  });

  for (const limit of rejected) {
    logging.error(
      {
        event: { name: 'limits.host_setting_unusable' },
        limit: { name: limit.name, reason: limit.reason },
      },
      'A limit this site is configured with could not be used, so it is not applied',
    );
  }

  return {
    settings,
    // An empty URL is no URL, so it falls back rather than leaving a refusal with nowhere
    // to send the publisher.
    helpLink:
      billingEnabled && typeof billingUrl === 'string' && billingUrl
        ? billingUrl
        : 'https://ghost.org/help/',
    db: require('../../data/db'),
  };
}
