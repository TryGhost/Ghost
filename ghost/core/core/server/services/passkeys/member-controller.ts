const errors = require('@tryghost/errors');
const models = require('../../models');
const membersService = require('../members');
const passkeys = require('./index');
const urlUtils = require('../../../shared/url-utils').default;
import type * as express from 'express';
import {
  memberAuthenticationRequestSchema,
  memberRegistrationRequestSchema,
  passkeyIdParamsSchema,
} from './schema';

function memberOrigin() {
  return new URL(urlUtils.getSiteUrl()).origin;
}

type AuthenticatedMember = {
  id: string;
  email: string;
  name?: string | null;
};

async function authenticatedMember(
  req: express.Request,
  res: express.Response,
): Promise<AuthenticatedMember> {
  let member;
  try {
    member = await membersService.ssr.getMemberDataFromSession(req, res);
  } catch (error) {
    const missingSessionMessage = `Cookie ${membersService.ssr.sessionCookieName} not found`;
    if (
      error instanceof Error &&
      error instanceof errors.BadRequestError &&
      error.message === missingSessionMessage
    ) {
      throw new errors.UnauthorizedError({
        message: 'Member sign-in required.',
      });
    }
    throw error;
  }
  if (!member) {
    throw new errors.UnauthorizedError({ message: 'Member sign-in required.' });
  }
  return member;
}

module.exports = {
  async list(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const member = await authenticatedMember(req, res);
      const origin = memberOrigin();
      const credentials = await passkeys.list({
        memberId: member.id,
        rpID: new URL(origin).hostname,
      });
      res.json({ passkeys: credentials });
    } catch (error) {
      next(error);
    }
  },

  async beginRegistration(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const member = await authenticatedMember(req, res);
      const origin = memberOrigin();
      const { options } = await passkeys.registrationOptions({
        memberId: member.id,
        email: member.email,
        name: member.name,
        origin,
      });
      const ceremony = passkeys.createCeremonyToken({
        challenge: options.challenge,
        purpose: 'member-registration',
        subjectId: member.id,
      });
      res.json({ options, ceremony });
    } catch (error) {
      next(error);
    }
  },

  async finishRegistration(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const member = await authenticatedMember(req, res);
      const request = memberRegistrationRequestSchema.safeParse(req.body);
      if (!request.success) {
        throw new errors.BadRequestError({
          message: 'Invalid passkey registration request.',
        });
      }
      const ceremony = passkeys.verifyCeremonyToken(request.data.ceremony, {
        purpose: 'member-registration',
        subjectId: member.id,
      });
      if (!ceremony) {
        throw new errors.BadRequestError({
          message: 'Passkey registration challenge expired.',
        });
      }
      const credential = await passkeys.register({
        memberId: member.id,
        origin: memberOrigin(),
        expectedChallenge: ceremony.challenge,
        response: request.data.response,
        name: request.data.name,
        ceremonyId: ceremony.id,
        ceremonyExpires: ceremony.expires,
      });
      if (!credential) {
        throw new errors.BadRequestError({
          message: 'Passkey registration failed.',
        });
      }
      res.status(201).json({ passkeys: [credential] });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const member = await authenticatedMember(req, res);
      const params = passkeyIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new errors.NotFoundError({ message: 'Passkey not found.' });
      }
      const origin = memberOrigin();
      const removed = await passkeys.remove({
        id: params.data.id,
        memberId: member.id,
        rpID: new URL(origin).hostname,
      });
      if (!removed) {
        throw new errors.NotFoundError({ message: 'Passkey not found.' });
      }
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },

  async beginAuthentication(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const { options } = await passkeys.authenticationOptions({
        origin: memberOrigin(),
      });
      const ceremony = passkeys.createCeremonyToken({
        challenge: options.challenge,
        purpose: 'member-authentication',
      });
      res.json({ options, ceremony });
    } catch (error) {
      next(error);
    }
  },

  async finishAuthentication(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const request = memberAuthenticationRequestSchema.safeParse(req.body);
      if (!request.success) {
        throw new errors.UnauthorizedError({
          message: 'Passkey authentication failed.',
        });
      }
      const ceremony = passkeys.verifyCeremonyToken(request.data.ceremony, {
        purpose: 'member-authentication',
      });
      if (!ceremony) {
        throw new errors.UnauthorizedError({
          message: 'Passkey authentication challenge expired.',
        });
      }
      const result = await passkeys.authenticate({
        origin: memberOrigin(),
        expectedChallenge: ceremony.challenge,
        response: request.data.response,
        audience: 'member',
        ceremonyId: ceremony.id,
        ceremonyExpires: ceremony.expires,
      });
      if (!result?.memberId) {
        throw new errors.UnauthorizedError({
          message: 'Passkey authentication failed.',
        });
      }
      const member = await models.Member.findOne({ id: result.memberId });
      if (!member) {
        throw new errors.UnauthorizedError({
          message: 'Passkey authentication failed.',
        });
      }
      await membersService.ssr.createSessionForMember(req, res, member.toJSON());
      await models.MemberLoginEvent.add({ member_id: member.id });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
};
