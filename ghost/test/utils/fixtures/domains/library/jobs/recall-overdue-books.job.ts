import { defineJob } from '@tryghost/kernel/domains/definitions';
import catalogue from '../services/catalogue';

export default defineJob({
  schedule: { once: 'boot', delay: 10 },
  run() {
    catalogue.service.recallOverdue();
  },
});
