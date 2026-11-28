import { randomUUID } from 'node:crypto';
import { defineService } from '../../../kernel/define-service';
import { InvalidationsService } from './invalidations-service';
import { RedisTransport, channelFor } from './redis-transport';
import { LocalTransport } from './transport';

// Needs only config. Boot initializes it before the caches that register with
// it, so a peer's message is never missed after boot.
export default defineService('Invalidations', {
  create: () => {
    const config: typeof import('../../../shared/config') = require('../../../shared/config');
    const logging = require('@tryghost/logging');
    const options = config.get('invalidations');
    const transport =
      options.transport === 'redis'
        ? new RedisTransport({
            connection: options.redis ?? {},
            channel:
              options.channel ?? channelFor({ url: config.get('url'), env: config.get('env') }),
            logging,
          })
        : new LocalTransport();

    return new InvalidationsService({ transport, instanceId: randomUUID(), logging });
  },
  start: (service) => service.start(),
  stop: (service) => service.stop(),
});
