import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import * as security from '@tryghost/security';

export type Invitation = {
  invitation: Array<{ token: string; name: string; password: string }>;
};

type TransactionOptions<Transaction> = {
  context: { internal: true };
  transacting: Transaction;
  forUpdate: true;
};

// Acceptance only forwards the transaction handle to these model methods.
export type AcceptanceModels<Transaction = unknown> = {
  Base: {
    transaction<T>(callback: (transacting: Transaction) => Promise<T>): Promise<T>;
  };
  Invite: {
    findOne(
      data: { token: string; status: 'sent' },
      options: TransactionOptions<Transaction>,
    ): Promise<{
      get(key: 'expires'): number;
      get(key: 'email' | 'role_id'): string;
      destroy(options: TransactionOptions<Transaction>): Promise<unknown>;
    } | null>;
  };
  User: {
    findOne(data: { email: string }, options: TransactionOptions<Transaction>): Promise<unknown>;
    add(
      data: { email: string; name: string; password: string; roles: string[] },
      options: TransactionOptions<Transaction>,
    ): Promise<unknown>;
  };
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

export async function accept<Transaction>(
  invitation: Invitation,
  models: AcceptanceModels<Transaction>,
): Promise<void> {
  const data = invitation.invitation[0];
  const inviteToken = security.url.decodeBase64(data.token);

  return models.Base.transaction(async (transacting) => {
    const options: TransactionOptions<Transaction> = {
      context: { internal: true },
      transacting,
      forUpdate: true,
    };

    const invite = await models.Invite.findOne({ token: inviteToken, status: 'sent' }, options);

    if (!invite) {
      throw new errors.NotFoundError({ message: tpl(messages.inviteNotFound) });
    }

    if (invite.get('expires') < Date.now()) {
      throw new errors.NotFoundError({ message: tpl(messages.inviteExpired) });
    }

    const email = invite.get('email');

    const user = await models.User.findOne({ email }, options);
    if (user) {
      throw new errors.ValidationError({
        message: tpl(messages.inviteEmailAlreadyExist.message),
        context: tpl(messages.inviteEmailAlreadyExist.context),
        help: tpl(messages.inviteEmailAlreadyExist.help),
      });
    }

    const roleId = invite.get('role_id');

    await invite.destroy(options);

    await models.User.add(
      {
        email,
        name: data.name,
        password: data.password,
        roles: [roleId],
      },
      options,
    );
  });
}
