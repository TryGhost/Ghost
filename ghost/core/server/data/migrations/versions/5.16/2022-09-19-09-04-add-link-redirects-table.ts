import logging from '@tryghost/logging';
export default {
  async up() {
    logging.warn('Skipping migration - noop');
  },
  async down() {
    logging.warn('Skipping migration - noop');
  },
};
