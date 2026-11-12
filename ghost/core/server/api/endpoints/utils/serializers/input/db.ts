import type { Frame } from '@tryghost/api-framework';
import { utils } from '@tryghost/api-framework';
import _ from 'lodash';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:input:db');
const optionsUtil = utils.options;

const INTERNAL_OPTIONS: Array<'transacting' | 'forUpdate'> = ['transacting', 'forUpdate'];

type DbFrame = Frame<{
  options: {
    include?: unknown;
    transacting?: unknown;
    forUpdate?: unknown;
    context: { internal?: boolean };
  };
}>;

module.exports = {
  all(apiConfig: unknown, frame: DbFrame) {
    debug('serialize all');

    if (frame.options.include) {
      frame.options.include = optionsUtil.trimAndLowerCase(frame.options.include);
    }

    if (!frame.options.context.internal) {
      debug('omit internal options');
      frame.options = _.omit(frame.options, INTERNAL_OPTIONS);
    }
  },
};
