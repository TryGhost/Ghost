import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:output:slugs');

module.exports = {
  all(slug: string, apiConfig: unknown, frame: Frame) {
    debug('all');

    frame.response = {
      slugs: [{ slug }],
    };
  },
};
