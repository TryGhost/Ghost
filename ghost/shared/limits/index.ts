import { defineService } from '@tryghost/kernel/define-service';
import type { Foundation } from '@tryghost/kernel/foundation';
import { LimitService } from '@tryghost/limit-service';
import { loadHostLimits } from './host-limits';

/**
 * Limits: what the host allows this site to do (how many members, which
 * integrations, whether the site may be public).
 *
 * Needs the foundation only: the limits are in config, and a limit that
 * counts rows queries the database handle.
 *
 * The instance is built once per process. The host's limits are read from
 * config on every start, so a process that starts Ghost again picks up
 * limits that changed in between.
 */
export default defineService<LimitService, { foundation: Foundation }>('Limits', {
  create: () => new LimitService(),
  start: (limits, { foundation }) => loadHostLimits(limits, foundation),
});
