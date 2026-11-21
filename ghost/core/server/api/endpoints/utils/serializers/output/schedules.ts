import type { Frame } from '@tryghost/api-framework';

module.exports = {
  all(data: unknown, apiConfig: unknown, frame: Frame) {
    frame.response = data;
  },
};
