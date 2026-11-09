import type { Controller, Frame } from '@tryghost/api-framework';
import appInstallations from '../../services/app-installations';

type SessionFrame = Frame<{ options: { id: string; [key: string]: unknown } }>;

const controller = {
  docName: 'app_sessions',

  // Admin starts a session when it opens an app page. There's no body: the re-check only
  // fetches the approved manifest URL, never one from the request. So this needs the same
  // permission as reading the installation, unlike previewing, which fetches a URL from the
  // request and needs `add`. Anyone with `read` can trigger a re-check, which can suspend
  // the app or apply silent changes.
  start: {
    // The re-check can apply silent changes, suspend or resume the app, which changes how its
    // cards render on the site. Only then is the site's cache cleared, not on every session.
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'app_installations', method: 'read' },
    async query(frame: SessionFrame) {
      const { service } = appInstallations;
      const before = await service.read(frame.options.id).catch(() => undefined);
      const session = await service.startSession(frame.options.id);
      const after = session.installation;
      if (!before || before.revision !== after.revision || before.status !== after.status) {
        frame.setHeader('X-Cache-Invalidate', '/*');
      }
      return session;
    },
  },
} satisfies Controller<{ start: SessionFrame }>;

module.exports = controller;
