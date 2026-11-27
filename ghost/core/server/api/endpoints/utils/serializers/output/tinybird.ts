import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:output:tinybird');

module.exports = {
  all(data: unknown, apiConfig: unknown, frame: Frame) {
    debug('all');

    frame.response = {
      tinybird: data,
    };
  },
};
