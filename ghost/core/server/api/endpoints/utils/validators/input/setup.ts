import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

const debug = debugFactory('api:endpoints:utils:validators:input:updateSetup');

const messages = {
  notTheBlogOwner: 'You are not the site owner.',
};

module.exports = {
  updateSetup(apiConfig: unknown, frame: Frame) {
    debug('resetPassword');

    if (!frame.options.context || !frame.options.context.user) {
      throw new errors.NoPermissionError({ message: tpl(messages.notTheBlogOwner) });
    }
  },
};
