import type { Frame } from '@tryghost/api-framework';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

type OembedFrame = Frame<{ data: { url?: string } }>;

const messages = {
  noUrlProvided: 'No url provided.',
};

module.exports = {
  read(apiConfig: unknown, frame: OembedFrame) {
    if (!frame.data.url || !frame.data.url.trim()) {
      return Promise.reject(
        new errors.BadRequestError({
          message: tpl(messages.noUrlProvided),
        }),
      );
    }
  },
};
