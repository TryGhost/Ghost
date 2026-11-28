import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Principal } from '../../auth/principal';
import appInstallations from '../../services/app-installations';

type TokenFrame = Frame<{
  data: { app_tokens: Array<Record<string, unknown>> };
  options: { id: string; context: { principal?: Principal | null }; [key: string]: unknown };
}>;

/** A token is for the revision the app session started with. */
const SessionRevision = z.object({ revision: z.number().int().nonnegative() });

const controller = {
  docName: 'app_tokens',

  // Admin renews an app session's token before it expires. Each call issues a new token;
  // nothing about the session is stored, and nothing is fetched from the app. Same permission
  // as starting a session.
  add: {
    statusCode: 201,
    headers: { cacheInvalidate: false },
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { docName: 'app_installations', method: 'read' },
    query(frame: TokenFrame) {
      // The framework refuses a body without a non-empty `app_tokens` array before this runs
      const parsed = SessionRevision.safeParse(frame.data.app_tokens[0]);
      if (!parsed.success) {
        throw new errors.ValidationError({
          message: 'Expected the revision the session started with.',
        });
      }
      return appInstallations.service.createToken(
        frame.options.id,
        parsed.data.revision,
        frame.options.context.principal ?? null,
      );
    },
  },
} satisfies Controller<{ add: TokenFrame }>;

module.exports = controller;
