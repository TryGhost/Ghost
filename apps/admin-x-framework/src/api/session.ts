import {createMutation} from '../utils/api/hooks';

// Types

export interface PasswordCredentials {
    username: string;
    password: string;
}

// Requests

// The session endpoints respond with plain text rather than JSON ('Created'
// for session creation, 'OK' for resending a verification code). Failures
// reject with a JSONError: callers that need to branch on the error (e.g. a
// 403 with a first error code of '2FA_TOKEN_REQUIRED' or
// '2FA_NEW_DEVICE_DETECTED' signalling that email verification is required)
// can inspect `error.data.errors[0]` directly.

export const useCreateSession = createMutation<string, PasswordCredentials>({
    method: 'POST',
    path: () => '/session/',
    body: credentials => credentials
});

export const useDeleteSession = createMutation<void, void>({
    method: 'DELETE',
    path: () => '/session/'
});

export const useSendVerificationCode = createMutation<string, void>({
    method: 'POST',
    path: () => '/session/verify'
});

export const useVerifySession = createMutation<string, {token: string}>({
    method: 'PUT',
    path: () => '/session/verify',
    body: ({token}) => ({token})
});
