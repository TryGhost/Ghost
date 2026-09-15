import errors from '@tryghost/errors';
import { parseHostLimits, parseHostSubscription } from '@tryghost/limit-service';

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
 * Configuration is data from elsewhere, so it is read rather than assumed, and a site whose
 * limits cannot be read refuses to start. A limit that is configured but unreadable is not
 * enforced, so accepting one would sell a customer a limit that was never applied and leave
 * no trace of it; boot is the last moment at which that is still someone's mistake to fix.
 */
export function fromHostSettings(config: GhostConfig): LimitServiceInitOptions {
  const billingEnabled = config.get('hostSettings:billing:enabled') === true;
  const billingUrl = config.get('hostSettings:billing:url');
  return {
    limits: parseHostLimits(config.get('hostSettings:limits'), errors),
    subscription: parseHostSubscription(config.get('hostSettings:subscription'), errors),
    helpLink:
      billingEnabled && typeof billingUrl === 'string' ? billingUrl : 'https://ghost.org/help/',
    db: require('../../data/db'),
  };
}
