import logging from '@tryghost/logging';

// noop: this migration was moved to 6.18
export default {
  async up() {
    logging.warn('Skipping migration - noop');
  },
  async down() {
    logging.warn('Skipping migration - noop');
  },
};
