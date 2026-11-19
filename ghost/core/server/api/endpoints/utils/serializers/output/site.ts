import type { Frame } from '@tryghost/api-framework';
import _ from 'lodash';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:output:site');

module.exports = {
  read(data: object, apiConfig: unknown, frame: Frame) {
    debug('read');

    frame.response = {
      site: _.pick(data, [
        'title',
        'description',
        'logo',
        'icon',
        'cover_image',
        'accent_color',
        'locale',
        'timezone',
        'url',
        'version',
        'allow_external_signup',
        'sentry_dsn',
        'sentry_env',
        'site_uuid',
      ]),
    };
  },
};
