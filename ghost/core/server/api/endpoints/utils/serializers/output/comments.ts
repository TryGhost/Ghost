import type { Frame } from '@tryghost/api-framework';

module.exports = {
  counts(response: unknown, apiConfig: unknown, frame: Frame) {
    frame.response = response;
  },
};
