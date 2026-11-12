import debugFactory from '@tryghost/debug';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

const debug = debugFactory('api:endpoints:utils:validators:input:users');

const messages = {
  newPasswordsDoNotMatch: 'Your new passwords do not match',
};

module.exports = {
  changePassword(
    apiConfig: unknown,
    frame: { data: { password: Array<{ newPassword?: unknown; ne2Password?: unknown }> } },
  ) {
    debug('changePassword');

    const data = frame.data.password[0];

    if (data.newPassword !== data.ne2Password) {
      return Promise.reject(
        new errors.ValidationError({
          message: tpl(messages.newPasswordsDoNotMatch),
        }),
      );
    }
  },
};
