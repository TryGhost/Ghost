import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { service } from '../../services/app-installations';

// The framework refuses a body without a non-empty `app_installation_previews` array
// before any handler runs; what is inside it is checked here.
type PreviewFrame = Frame<{ data: { app_installation_previews: Array<Record<string, unknown>> } }>;

const controller = {
  docName: 'app_installation_previews',

  // Fetches and checks an app's manifest so the publisher can review it before installing
  // or approving it. Nothing is stored. Making Ghost fetch a URL is part of installing, so
  // it takes the permission to install.
  add: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'app_installations', method: 'add' },
    query(frame: PreviewFrame) {
      const [input] = frame.data.app_installation_previews;
      if (typeof input?.manifest_url !== 'string') {
        throw new errors.ValidationError({ message: 'Expected the manifest_url to preview.' });
      }
      return service!.preview(input.manifest_url);
    },
  },
} satisfies Controller<{ add: PreviewFrame }>;

module.exports = controller;
