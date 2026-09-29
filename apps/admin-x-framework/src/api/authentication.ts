import { createMutation, createQuery } from '../utils/api/hooks';

// Types

export interface SetupStatusResponseType {
  setup: Array<{
    status: boolean;
    // Prefill values from Ghost's config, only present before setup
    title?: string;
    name?: string;
    email?: string;
  }>;
}

export interface InvitationStatusResponseType {
  invitation: Array<{ valid: boolean }>;
}

export interface PasswordResetResponseType {
  password_reset: Array<{ message: string }>;
}

export interface CompletePasswordResetPayload {
  token: string;
  newPassword: string;
  ne2Password: string;
}

export interface AcceptInvitationPayload {
  token: string;
  name: string;
  email: string;
  password: string;
}

export interface CompleteSetupPayload {
  name: string;
  email: string;
  password: string;
  blogTitle: string;
}

// Every write here consumes something single-use (a reset token, an invite,
// the unset-up site), so a retried request after a lost response would fail
// against its own first attempt. None of these endpoints needs a session, so
// their 401s are answers rather than an expired session.
const authenticationRequestOptions = { retry: false, sessionExpiryRedirect: false } as const;

// Requests

export const useSetupStatus = createQuery<SetupStatusResponseType>({
  dataType: 'SetupStatusResponseType',
  path: '/authentication/setup/',
});

/** Whether a sent, unaccepted invitation exists for the email; the server does not check expiry here. */
export const useInvitationStatus = createQuery<InvitationStatusResponseType>({
  dataType: 'InvitationStatusResponseType',
  path: '/authentication/invitation/',
});

export const useRequestPasswordReset = createMutation<PasswordResetResponseType, { email: string }>(
  {
    method: 'POST',
    path: () => '/authentication/password_reset/',
    body: ({ email }) => ({ password_reset: [{ email }] }),
    ...authenticationRequestOptions,
  },
);

// On success the server also signs the user in with an already verified session.
export const useCompletePasswordReset = createMutation<
  PasswordResetResponseType,
  CompletePasswordResetPayload
>({
  method: 'PUT',
  path: () => '/authentication/password_reset/',
  body: (payload) => ({ password_reset: [payload] }),
  ...authenticationRequestOptions,
});

// Creates the account without signing in; `email` is ignored by current servers
// (the invite's own address is used) but required by older ones.
export const useAcceptInvitation = createMutation<unknown, AcceptInvitationPayload>({
  method: 'POST',
  path: () => '/authentication/invitation/',
  body: (payload) => ({ invitation: [payload] }),
  ...authenticationRequestOptions,
});

// Creates the owner account without signing in.
export const useCompleteSetup = createMutation<unknown, CompleteSetupPayload>({
  method: 'POST',
  path: () => '/authentication/setup/',
  body: (payload) => ({ setup: [payload] }),
  ...authenticationRequestOptions,
});
