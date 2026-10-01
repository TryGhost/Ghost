import { actingContext, service } from '../../services/app-installations';

interface Frame {
  options: {
    id: string;
    context: unknown;
    [key: string]: unknown;
  };
}

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
    query(frame: Frame) {
      return service!.read(frame.options.id);
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: true,
    query(frame: Frame) {
      return service!.uninstall(actingContext(frame.options.context), frame.options.id);
    },
  },
};

module.exports = controller;
