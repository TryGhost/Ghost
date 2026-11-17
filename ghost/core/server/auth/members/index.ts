import type { Request, Response } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import { UnauthorizedError } from '@tryghost/errors';
import membersService from '../../services/members';
import config from '../../../shared/config';

type Next = (err?: unknown, ...rest: unknown[]) => void;

let UNO_MEMBERINO: ReturnType<typeof jwt> | undefined;

async function createMiddleware() {
  const { protocol, host } = new URL(config.get('url'));
  const siteOrigin = `${protocol}//${host}`;

  const membersConfig = await membersService.api.getPublicConfig();
  return jwt({
    credentialsRequired: false,
    requestProperty: 'member',
    audience: siteOrigin,
    issuer: membersConfig.issuer,
    algorithms: ['RS512'],
    secret: (req, token) => membersConfig.getVerificationKey(token?.header.kid),
    getToken(req) {
      const authorization = req.get('authorization');
      if (!authorization) {
        // express-jwt treats any falsy token as none
        return undefined;
      }

      const [scheme, credentials] = authorization.split(/\s+/);

      if (scheme !== 'GhostMembers') {
        return undefined;
      }

      return credentials;
    },
  });
}

export async function authenticateMembersToken(req: Request, res: Response, next: Next) {
  if (!UNO_MEMBERINO) {
    UNO_MEMBERINO = await createMiddleware();
  }
  try {
    const middleware = UNO_MEMBERINO;

    middleware(req, res, function (err?: unknown, ...rest: unknown[]) {
      if (err && (err as Error).name === 'UnauthorizedError') {
        return next(new UnauthorizedError({ err: err as Error }), ...rest);
      }
      return next(err, ...rest);
    });
  } catch (err) {
    next(err);
  }
}
