import type { Controller, Frame } from '@tryghost/api-framework';
import appInstallations from '../../services/app-installations';

type SessionFrame = Frame<{ options: { id: string; [key: string]: unknown } }>;

const controller = {
  docName: 'app_sessions',

  // Admin starts a session when an app page opens. No body, as the only URL Ghost fetches
  // is the one the publisher approved, and it keeps what it finds there as it would by
  // itself. So opening an app takes the same permission as reading its installation, unlike
  // previewing, where the caller names the URL. Granting `read` more widely also lets
  // those callers make Ghost re-check an app, which can suspend it or apply silent changes.
  start: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'app_installations', method: 'read' },
    query(frame: SessionFrame) {
      return appInstallations.service.startSession(frame.options.id);
    },
  },
} satisfies Controller<{ start: SessionFrame }>;

module.exports = controller;
