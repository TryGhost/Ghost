import { defineService } from '@tryghost/kernel/define-service';
import type { LibraryDependencies } from '../../boot';

// Nothing waits for reports: boot is not held up while it starts.
export default defineService('Reports', {
  create: ({ record }: LibraryDependencies) => {
    record('start reports');
    return { ready: true };
  },
  blocking: false,
});
