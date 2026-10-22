import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import * as security from '@tryghost/security';
import type { AcceptanceRepository } from './acceptance-repository';

export type Invitation = {
  invitation: Array<{ token: string; name: string; password: string }>;
};

const messages = {
  inviteNotFound: 'Invite not found.',
  inviteExpired: 'Invite is expired.',
  inviteEmailAlreadyExist: {
    message: 'Could not create an account, email is already in use.',
    context: 'Attempting to create an account with existing email address.',
    help: 'Use different email address to register your account.',
  },
};

export async function accept(
  invitation: Invitation,
  repository: AcceptanceRepository,
): Promise<void> {
  const data = invitation.invitation[0];
  const inviteToken = security.url.decodeBase64(data.token);

  return repository.transaction(async (transaction) => {
    const invite = await transaction.findSentInvite(inviteToken);

    if (!invite) {
      throw new errors.NotFoundError({ message: tpl(messages.inviteNotFound) });
    }

    if (invite.expires < Date.now()) {
      throw new errors.NotFoundError({ message: tpl(messages.inviteExpired) });
    }

    const email = invite.email;
    if (await transaction.userExists(email)) {
      throw new errors.ValidationError({
        message: tpl(messages.inviteEmailAlreadyExist.message),
        context: tpl(messages.inviteEmailAlreadyExist.context),
        help: tpl(messages.inviteEmailAlreadyExist.help),
      });
    }

    await invite.consume();
    await transaction.addUser({
      email,
      name: data.name,
      password: data.password,
      roles: [invite.roleId],
    });
  });
}
