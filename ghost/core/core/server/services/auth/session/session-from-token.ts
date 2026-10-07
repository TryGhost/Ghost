import type * as express from 'express';

type User = { id: string };

/**
 * Returns a connect middleware function which exchanges a token for a session
 */
export const sessionFromToken =
  <Token, Lookup>({
    getTokenFromRequest,
    getLookupFromToken,
    findUserByLookup,
    createSession,
    callNextWithError,
  }: Readonly<{
    getTokenFromRequest: (req: express.Request) => Promise<Token>;
    getLookupFromToken: (token: Token) => Promise<Lookup>;
    findUserByLookup: (lookup: Lookup) => Promise<User>;
    createSession: (req: express.Request, res: express.Response, user: User) => Promise<void>;
    callNextWithError: boolean;
  }>): ((
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => Promise<void>) =>
  async (req, res, next) => {
    try {
      const token = await getTokenFromRequest(req);
      if (!token) {
        return next();
      }
      const email = await getLookupFromToken(token);
      if (!email) {
        return next();
      }
      const user = await findUserByLookup(email);
      if (!user) {
        return next();
      }
      await createSession(req, res, user);
      next();
    } catch (err) {
      if (callNextWithError) {
        next(err);
      } else {
        next();
      }
    }
  };
