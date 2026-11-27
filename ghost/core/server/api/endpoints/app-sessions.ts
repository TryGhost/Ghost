import type { Controller, Frame } from '@tryghost/api-framework';
import type { Principal } from '../../auth/principal';
import appInstallations from '../../services/app-installations';

type SessionOptions = {
  id: string;
  context: { principal?: Principal | null };
  [key: string]: unknown;
};

type SessionFrame = Frame<{ options: SessionOptions }>;

const controller = {
  docName: 'app_sessions',

  // Admin starts a session when it opens an app page. There's no body: the re-check only
  // fetches the approved manifest URL, never one from the request. So this needs the same
  // permission as reading the installation, unlike previewing, which fetches a URL from the
  // request and needs `add`. Anyone with `read` can trigger a re-check, which can suspend
  // the app or apply silent changes.
  start: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'app_installations', method: 'read' },
    query(frame: SessionFrame) {
      return appInstallations.service.startSession(
        frame.options.id,
        frame.options.context.principal ?? null,
      );
    },
  },
} satisfies Controller<{ start: SessionFrame }>;

module.exports = controller;
