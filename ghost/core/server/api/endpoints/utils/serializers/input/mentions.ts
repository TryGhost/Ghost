import type { Frame } from '@tryghost/api-framework';

type MentionsFrame = Frame<{ options: { filter?: string } }>;

module.exports = {
  browse(_apiConfig: unknown, frame: MentionsFrame) {
    // Force source:-~^'https://brid.gy/' to be added to the filter
    const filterBridgy = `source:-~^'https://brid.gy/'`;
    if (frame.options.filter) {
      frame.options.filter = `${frame.options.filter}+${filterBridgy}`;
    } else {
      frame.options.filter = filterBridgy;
    }
  },
};
