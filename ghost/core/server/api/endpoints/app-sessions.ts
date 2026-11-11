import type { Controller, Frame } from '@tryghost/api-framework';
import appInstallations from '../../services/app-installations';
import type { StaffSession } from '../../services/app-installations/app-tokens';

type SessionFrame = Frame<{ options: { id: string; [key: string]: unknown } }>;

/**
 * The staff user and Better Auth session behind the request. A staff token has no session, so it
 * gets no app tokens, and only a verified session resolves to a staff user at all.
 * Unwired: `session` is set once `resolvePrincipal` puts Better Auth sessions on the context.
 */
function staffSessionOf(context: unknown): StaffSession | undefined {
  const { user, session } = (context ?? {}) as { user?: string; session?: string };
  return user && session ? { userId: user, sessionId: session } : undefined;
}

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
        staffSessionOf(frame.options.context),
      );
    },
  },
} satisfies Controller<{ start: SessionFrame }>;

module.exports = controller;
