import type { Controller, Frame } from '@tryghost/api-framework';
import { actingContext, service } from '../../services/app-installations';

type InstallationFrame = Frame<{
  options: {
    id: string;
    context: unknown;
    [key: string]: unknown;
  };
}>;

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'app_installations',

  browse: {
    headers: noCacheInvalidation,
    permissions: true,
    async query() {
      return { data: await service!.browse() };
    },
  },

  read: {
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: true,
    query(frame: InstallationFrame) {
      return service!.read(frame.options.id);
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: true,
    query(frame: InstallationFrame) {
      return service!.uninstall(actingContext(frame.options.context), frame.options.id);
    },
  },
} satisfies Controller<{
  browse: Frame;
  read: InstallationFrame;
  destroy: InstallationFrame;
}>;

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = controller;
