import type { Frame } from '@tryghost/api-framework';
import { utils } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:input:exports');
const optionsUtil = utils.options;

type ExportsFrame = Frame<{ options: { components?: unknown } }>;

module.exports = {
  download(apiConfig: unknown, frame: ExportsFrame) {
    debug('download');

    // `components` arrives as a comma-separated string, or as an array
    // when the query param is repeated; absent stays absent
    if (frame.options.components !== undefined) {
      frame.options.components = optionsUtil
        .trimAndLowerCase(frame.options.components)
        .filter((component) => component !== '');
    }
  },
};
