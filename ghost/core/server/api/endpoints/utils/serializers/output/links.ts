import type { Frame } from '@tryghost/api-framework';

module.exports = {
  bulkEdit(data: unknown, apiConfig: unknown, frame: Frame) {
    frame.response = data;
  },
};
