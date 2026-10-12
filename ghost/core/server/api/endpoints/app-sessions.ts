import type { Controller, Frame } from '@tryghost/api-framework';
import { service } from '../../services/app-installations';

type SessionFrame = Frame<{ options: { id: string; [key: string]: unknown } }>;

const controller = {
  docName: 'app_sessions',

  // Starts a session of one installed app, which is what Admin asks for when an app page
  // opens: Ghost re-checks the app's manifest, then answers with the installation as it
  // stands and the revision the session pins. No body, as the only URL Ghost fetches is
  // the one the publisher approved. Opening an app takes the same permission as reading
  // its installation.
  start: {
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'app_installations', method: 'read' },
    query(frame: SessionFrame) {
      return service!.startSession(frame.options.id);
    },
  },
} satisfies Controller<{ start: SessionFrame }>;

module.exports = controller;
