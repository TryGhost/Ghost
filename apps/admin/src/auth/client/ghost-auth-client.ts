import { useMemo } from 'react';
import {
  useAcceptInvitation,
  useCompletePasswordReset,
  useCompleteSetup,
  useInvitationStatus,
  useRequestPasswordReset,
  useSetupStatus as useSetupStatusQuery,
} from '@tryghost/admin-x-framework/api/authentication';
import {
  isTwoFactorRequiredError,
  useAddSession,
  useDeleteSession,
  useSendSessionVerification,
  useVerifySession,
} from '@tryghost/admin-x-framework/api/session';
import {
  APIError,
  type ErrorResponse,
  MaintenanceError,
  VersionMismatchError,
} from '@tryghost/admin-x-framework/errors';
import type {
  AuthClient,
  AuthError,
  AuthErrorCode,
  AuthResult,
  Invitation,
  QueryState,
  SetupStatus,
} from './auth-client';

type GhostError = Partial<ErrorResponse['errors'][number]>;

interface Translation {
  code?: AuthErrorCode;
  message?: string;
}

const firstGhostError = (error: APIError): GhostError => {
  const { data } = error;
  if (data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
    return (data.errors[0] as GhostError | undefined) ?? {};
  }
  return {};
};

// Requests that reached the server become an AuthError; anything without a
// response, and the upgrade/maintenance states the app handles globally, throw.
function toAuthError(
  error: unknown,
  translate: (ghostError: GhostError, status: number) => Translation,
): AuthError {
  if (
    !(error instanceof APIError) ||
    !error.response ||
    error instanceof VersionMismatchError ||
    error instanceof MaintenanceError
  ) {
    throw error;
  }
  const { status, statusText } = error.response;
  return { status, statusText, ...translate(firstGhostError(error), status) };
}

async function settle<T>(
  request: Promise<unknown>,
  toData: (response: unknown) => T,
  translate: (ghostError: GhostError, status: number) => Translation,
): Promise<AuthResult<T>> {
  try {
    return { data: toData(await request), error: null };
  } catch (error) {
    return { data: null, error: toAuthError(error, translate) };
  }
}

const translateSignIn = (ghost: GhostError, status: number): Translation => {
  let code: AuthErrorCode | undefined;
  if (status === 404) {
    code = 'USER_NOT_FOUND';
  } else if (ghost.code === 'PASSWORD_INCORRECT') {
    code = 'INVALID_PASSWORD';
  } else if (ghost.type === 'PasswordResetRequiredError') {
    code = 'PASSWORD_RESET_REQUIRED';
  }
  const message =
    ghost.type === 'TooManyRequestsError' ? ghost.message : ghost.context || ghost.message;
  return { code, message: message || undefined };
};

const messageOnly = ({ message }: GhostError): Translation => ({ message: message || undefined });

const joined = (...parts: Array<string | null | undefined>) =>
  parts.filter(Boolean).join(' ') || undefined;

/** Invite and reset tokens are base64url of `expiry|email|hash`. */
function decodeTokenEmail(token: string): string | null {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    return window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')).split('|')[1] || null;
  } catch {
    return null;
  }
}

const INVITE_TOKEN = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}|[A-Za-z0-9_-]{3})?$/;

export function useGhostAuthClient(): AuthClient {
  const { mutateAsync: addSession } = useAddSession();
  const { mutateAsync: verifySession } = useVerifySession();
  const { mutateAsync: sendVerification } = useSendSessionVerification();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { mutateAsync: requestReset } = useRequestPasswordReset();
  const { mutateAsync: completeReset } = useCompletePasswordReset();
  const { mutateAsync: acceptInvitation } = useAcceptInvitation();
  const { mutateAsync: completeSetup } = useCompleteSetup();

  return useMemo<AuthClient>(
    () => ({
      signIn: {
        async email({ email, password }) {
          try {
            await addSession({ username: email, password });
            return { data: { redirect: false }, error: null };
          } catch (error) {
            if (isTwoFactorRequiredError(error)) {
              const code = error.data?.errors?.[0]?.code;
              return {
                data: {
                  twoFactorRedirect: true,
                  twoFactorMethods: ['otp'],
                  twoFactorReason: code === '2FA_TOKEN_REQUIRED' ? 'required' : 'new-device',
                },
                error: null,
              };
            }
            return { data: null, error: toAuthError(error, translateSignIn) };
          }
        },
      },
      twoFactor: {
        sendOtp: () =>
          settle(sendVerification(null), () => ({ status: true as const }), messageOnly),
        verifyOtp: ({ code }) =>
          settle(
            verifySession({ token: code }),
            () => ({ redirect: false as const }),
            (ghost, status) => (status === 401 ? { code: 'INVALID_CODE' } : messageOnly(ghost)),
          ),
      },
      requestPasswordReset: ({ email }) =>
        settle(
          requestReset({ email }),
          () => ({ status: true as const }),
          (ghost, status) => ({
            ...messageOnly(ghost),
            code: status === 404 ? 'USER_NOT_FOUND' : undefined,
          }),
        ),
      resetPassword: ({ newPassword, token }) =>
        settle(
          completeReset({ token, newPassword, ne2Password: newPassword }),
          (response) => ({
            status: true as const,
            message: (response as { password_reset?: Array<{ message?: string }> })
              ?.password_reset?.[0]?.message,
          }),
          (ghost) => ({
            message:
              ghost.context === ghost.message
                ? ghost.message
                : joined(ghost.message, ghost.context),
          }),
        ),
      signOut: () => settle(deleteSession(null), () => ({ success: true as const }), messageOnly),
      invitation: {
        accept: ({ token, name, password }) =>
          settle(
            acceptInvitation({ token, name, password, email: decodeTokenEmail(token) ?? '' }),
            () => ({ status: true as const }),
            messageOnly,
          ),
      },
      setup: {
        create: (body) =>
          settle(
            completeSetup(body),
            () => ({ status: true as const }),
            (ghost) => ({
              message: joined(ghost.message, ghost.context),
            }),
          ),
      },
      getResetTokenEmail: decodeTokenEmail,
    }),
    [
      acceptInvitation,
      addSession,
      completeReset,
      completeSetup,
      deleteSession,
      requestReset,
      sendVerification,
      verifySession,
    ],
  );
}

const decodeApostrophes = (value?: string) => value?.replace(/&apos;/gi, "'");

export function useGhostSetupStatus(): QueryState<SetupStatus> {
  const { data, isLoading, isError } = useSetupStatusQuery({ defaultErrorHandler: false });
  const setup = data?.setup?.[0];

  return {
    data: setup && {
      isSetup: setup.status === true,
      title: decodeApostrophes(setup.title),
      name: decodeApostrophes(setup.name),
      email: setup.email,
    },
    isPending: isLoading,
    isError,
  };
}

export function useGhostInvitation(token: string): QueryState<Invitation> {
  const email = INVITE_TOKEN.test(token) ? decodeTokenEmail(token) : null;
  const { data, isLoading, isError } = useInvitationStatus({
    searchParams: { email: email ?? '' },
    enabled: email !== null,
    defaultErrorHandler: false,
  });

  if (email === null) {
    return { data: { email: null, valid: false }, isPending: false, isError: false };
  }

  // An unanswered check still shows the form; accepting reports a bad invite.
  return {
    data: data || isError ? { email, valid: data?.invitation?.[0]?.valid !== false } : undefined,
    isPending: isLoading,
    isError,
  };
}
