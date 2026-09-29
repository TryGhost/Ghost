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
  UnauthorizedError,
  VersionMismatchError,
} from '@tryghost/admin-x-framework/errors';
import type {
  AuthClient,
  AuthError,
  AuthErrorCode,
  AuthResult,
  Invitation,
  QueryState,
  SetupStatusState,
} from './auth-client';

type GhostError = Partial<ErrorResponse['errors'][number]>;

interface Translation {
  code?: AuthErrorCode;
  message?: string;
}

const firstGhostError = (error: APIError): GhostError | undefined => {
  const { data } = error;
  if (data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
    return data.errors[0] as GhostError | undefined;
  }
  return undefined;
};

// Ghost's answers become an AuthError. Anything else throws: no response, a
// response without Ghost's error body (e.g. a proxy's 502), and the
// upgrade/maintenance states, which have their own copy.
function toAuthError(
  error: unknown,
  translate: (ghostError: GhostError, status: number) => Translation,
): AuthError {
  const ghostError = error instanceof APIError ? firstGhostError(error) : undefined;
  if (
    !(error instanceof APIError) ||
    !error.response ||
    !ghostError ||
    error instanceof VersionMismatchError ||
    error instanceof MaintenanceError
  ) {
    throw error;
  }
  const { status, statusText } = error.response;
  return { status, statusText, ...translate(ghostError, status) };
}

/** The text for a failure that never produced an AuthError, falling back to the caller's own. */
export function describeUnexpectedError(error: unknown, fallback: string): string {
  if (error instanceof VersionMismatchError) {
    return 'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.';
  }
  if (error instanceof MaintenanceError) {
    return 'Sorry, Ghost is currently undergoing maintenance, please wait a moment then try again.';
  }
  return fallback;
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
        async verifyOtp({ code }) {
          try {
            await verifySession({ token: code });
            return { data: { redirect: false }, error: null };
          } catch (error) {
            // A wrong or expired code is a bare 401 with a text body.
            if (error instanceof UnauthorizedError && error.response?.status === 401) {
              const { status, statusText } = error.response;
              return { data: null, error: { status, statusText, code: 'INVALID_CODE' } };
            }
            return { data: null, error: toAuthError(error, messageOnly) };
          }
        },
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
          () => ({ status: true as const }),
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

export function useGhostSetupStatus(): SetupStatusState {
  const { data, isLoading, isError, refetch } = useSetupStatusQuery({ defaultErrorHandler: false });
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
    refetch,
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
