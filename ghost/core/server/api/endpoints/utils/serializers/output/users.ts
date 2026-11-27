import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';
import tpl from '@tryghost/tpl';

const debug = debugFactory('api:endpoints:utils:serializers:output:users');

type JsonModel = {
  toJSON(options: unknown): unknown;
};

const messages = {
  pwdChangedSuccessfully: 'Password changed successfully.',
};

module.exports = {
  changePassword(models: unknown, apiConfig: unknown, frame: Frame) {
    debug('changePassword');

    frame.response = {
      password: [{ message: tpl(messages.pwdChangedSuccessfully) }],
    };
  },

  transferOwnership(models: JsonModel[], apiConfig: unknown, frame: Frame) {
    debug('transferOwnership');

    frame.response = {
      users: models.map((model) => model.toJSON(frame.options)),
    };
  },

  readStaffToken(model: JsonModel, apiConfig: unknown, frame: Frame) {
    debug('readStaffToken');

    frame.response = {
      apiKey: model.toJSON(frame.options),
    };
  },

  regenerateStaffToken(model: JsonModel, apiConfig: unknown, frame: Frame) {
    debug('regenerateStaffToken');

    frame.response = {
      apiKey: model.toJSON(frame.options),
    };
  },
};
