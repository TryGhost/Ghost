import { randomUUID } from 'node:crypto';
import { defineService } from '../../../kernel/define-service';
import { InvalidationsService } from './invalidations-service';
import { LocalTransport } from './transport';

// Needs nothing else ready. Boot initializes it before the caches that
// register with it, so a peer's message is never missed after boot.
export default defineService('Invalidations', {
  create: () =>
    new InvalidationsService({
      transport: new LocalTransport(),
      instanceId: randomUUID(),
      logging: require('@tryghost/logging'),
    }),
  start: (service) => service.start(),
  stop: (service) => service.stop(),
});
