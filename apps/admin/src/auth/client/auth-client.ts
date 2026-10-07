/**
 * The client contract the auth screens are written against. It mirrors the
 * BetterAuth client (`better-auth/react`): calls resolve to `{data, error}`
 * instead of throwing, transport failures still throw, and errors carry a
 * `code` the screens branch on. `invitation`, `setup` and the reads below are
 * Ghost extensions with no BetterAuth equivalent. `describeUnexpectedError`
 * turns a thrown failure into the text to show.
 *
 * The implementation is chosen here; screens import only from this module.
 */

export type AuthErrorCode =
  /** Sign in or forgot password: no staff user has that email address. */
  | 'USER_NOT_FOUND'
  /** Sign in: the password does not match. */
  | 'INVALID_PASSWORD'
  /** Sign in: the account is locked and a reset email has already been sent. */
  | 'PASSWORD_RESET_REQUIRED'
  /** Verification: the emailed code is wrong or has expired. */
  | 'INVALID_CODE';

export interface AuthError {
  status: number;
  statusText: string;
  code?: AuthErrorCode;
  /** Text to show the user, when the server supplied one. */
  message?: string;
}

export type AuthResult<T> = { data: T; error: null } | { data: null; error: AuthError };

export type SignInData =
  | { redirect: false }
  | {
      twoFactorRedirect: true;
      twoFactorMethods: ['otp'];
      /**
       * Ghost extension: why the code was asked for, which changes the copy
       * on the verification screen. The code has already been emailed.
       */
      twoFactorReason?: 'required' | 'new-device';
    };

export interface AuthClient {
  signIn: {
    email(body: { email: string; password: string }): Promise<AuthResult<SignInData>>;
  };
  twoFactor: {
    /** Emails a new code, replacing the one sent at sign-in. */
    sendOtp(): Promise<AuthResult<{ status: true }>>;
    verifyOtp(body: { code: string }): Promise<AuthResult<{ redirect: false }>>;
  };
  requestPasswordReset(body: { email: string }): Promise<AuthResult<{ status: true }>>;
  /** On Ghost the reset also signs the user in; screens reload either way. */
  resetPassword(body: {
    newPassword: string;
    token: string;
  }): Promise<AuthResult<{ status: true }>>;
  signOut(): Promise<AuthResult<{ success: true }>>;
  invitation: {
    /** Creates the invited staff user without signing in. */
    accept(body: {
      token: string;
      name: string;
      password: string;
    }): Promise<AuthResult<{ status: true }>>;
  };
  setup: {
    /** Creates the owner account without signing in. */
    create(body: {
      name: string;
      email: string;
      password: string;
      blogTitle: string;
    }): Promise<AuthResult<{ status: true }>>;
  };
  /** The email a password reset link was issued for, when the token carries one. */
  getResetTokenEmail(token: string): string | null;
}

export interface QueryState<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
}

export interface SetupStatusState extends QueryState<SetupStatus> {
  refetch: () => Promise<unknown>;
}

export interface SetupStatus {
  isSetup: boolean;
  /** Prefill values configured for a new site. */
  title?: string;
  name?: string;
  email?: string;
}

export interface Invitation {
  /** Null when the link is malformed. */
  email: string | null;
  valid: boolean;
}

export {
  describeUnexpectedError,
  useGhostAuthClient as useAuthClient,
  useGhostInvitation as useInvitation,
  useGhostSetupStatus as useSetupStatus,
} from './ghost-auth-client';
