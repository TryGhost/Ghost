import { createMutation } from '../utils/api/hooks';
import { JSONError } from '../utils/errors';

export interface SessionCredentials {
  username: string;
  password: string;
}

export interface SessionVerification {
  token: string;
}

// The server replies 201 Created with only the status text ("Created") as a text/plain body.
export const useAddSession = createMutation<string, SessionCredentials>({
  method: 'POST',
  path: () => '/session/',
  body: (credentials) => credentials,
});

// The server replies 200 OK with only the status text ("OK") as a text/plain body; a wrong code is a bare 401.
export const useVerifySession = createMutation<string, SessionVerification>({
  method: 'PUT',
  path: () => '/session/verify/',
  body: ({ token }) => ({ token }),
});

// The server replies 204 No Content on sign-out, so the mutation resolves with no data.
export const useDeleteSession = createMutation<void, null>({
  method: 'DELETE',
  path: () => '/session/',
});

const twoFactorRequiredCodes = ['2FA_TOKEN_REQUIRED', '2FA_NEW_DEVICE_DETECTED'];

// Sign-in created the session but the server wants an emailed code before it is usable (403).
export const isTwoFactorRequiredError = (error: unknown): error is JSONError =>
  error instanceof JSONError &&
  twoFactorRequiredCodes.includes(error.data?.errors?.[0]?.code ?? '');
