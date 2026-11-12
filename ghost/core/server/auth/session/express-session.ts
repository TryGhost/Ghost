import type { Request, RequestHandler, Response } from 'express';
import util from 'node:util';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import type { Session } from './session-service';
import SessionStore from './session-store';

// express-session ships no types
const session = require('express-session');
const settingsCache = require('../../../shared/settings-cache');
const models = require('../../models');

const sessionStore = new SessionStore(models.Session);

let unoExpressSessionMiddleware: RequestHandler | undefined;

function getExpressSessionMiddleware(): RequestHandler {
  if (!unoExpressSessionMiddleware) {
    unoExpressSessionMiddleware = session({
      store: sessionStore,
      secret: settingsCache.get('admin_session_secret'),
      resave: false,
      saveUninitialized: false,
      name: 'ghost-admin-api-session',
      cookie: {
        maxAge: config.get('admin:sessionMaxAgeMs'),
        httpOnly: true,
        path: urlUtils.getSubdir() + '/ghost',
        sameSite: urlUtils.isSSL(config.get('url')) ? 'none' : 'lax',
        secure: urlUtils.isSSL(config.get('url')),
      },
    }) as RequestHandler;
  }
  return unoExpressSessionMiddleware;
}

export async function getSession(
  req: Request & { session?: Session },
  res: Response,
): Promise<Session> {
  if (req.session) {
    return req.session;
  }
  const expressSessionMiddleware = getExpressSessionMiddleware();
  return new Promise((resolve, reject) => {
    expressSessionMiddleware(req, res, function (err?: unknown) {
      if (err) {
        return reject(err);
      }
      resolve(req.session as Session);
    });
  });
}

export const deleteAllSessions = util.promisify(sessionStore.clear.bind(sessionStore));
