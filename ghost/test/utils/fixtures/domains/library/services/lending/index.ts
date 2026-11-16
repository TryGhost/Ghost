import { defineService } from '../../../../../../../core/kernel/define-service';
import type { LibraryDependencies } from '../../boot';
import catalogue from '../catalogue';
import { LendingService } from './lending.service';

// Lending reads the ready catalogue while it is built, so the catalogue starts first.
export default defineService('Lending', {
  create: ({ publish, now, record }: LibraryDependencies) => {
    record('start lending');
    return new LendingService({ catalogue: catalogue.service, publish, now });
  },
  startAfter: ['catalogue'],
});
