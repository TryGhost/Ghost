import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

const messages = {
  noUrlProvided: 'No url provided.',
};

module.exports = {
  read(apiConfig: unknown, frame: { data: { url?: string } }) {
    if (!frame.data.url || !frame.data.url.trim()) {
      return Promise.reject(
        new errors.BadRequestError({
          message: tpl(messages.noUrlProvided),
        }),
      );
    }
  },
};
