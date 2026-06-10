import {createMutation, createQuery} from '../utils/api/hooks';

// Types

export type SetupStatus = {
    status: boolean;
    title?: string;
    name?: string;
    email?: string;
};

export interface SetupStatusResponseType {
    setup: SetupStatus[];
}

export interface InvitationStatusResponseType {
    invitation: Array<{valid: boolean}>;
}

export interface PasswordResetResponseType {
    password_reset: Array<{
        message?: string;
        // Only returned by legacy backends that have not yet started minting
        // a verified session as part of the password reset itself
        emailVerificationToken?: string;
    }>;
}

// Helpers

/**
 * Invite/reset tokens base64-encode `expiry|email|hash`. Returns the email
 * embedded in the token, or null when the token cannot be decoded.
 */
export function getTokenEmail(token: string): string | null {
    try {
        return window.atob(token).split('|')[1] || null;
    } catch {
        return null;
    }
}

// Requests

const setupStatusQuery = createQuery<SetupStatusResponseType>({
    dataType: 'SetupStatusResponseType',
    path: '/authentication/setup/'
});

export const getSetupStatus = (options: {enabled?: boolean} = {}) => setupStatusQuery({
    defaultErrorHandler: false,
    ...options
});

const invitationStatusQuery = createQuery<InvitationStatusResponseType>({
    dataType: 'InvitationStatusResponseType',
    path: '/authentication/invitation/'
});

export const getInvitationValidity = (email: string, options: {enabled?: boolean} = {}) => invitationStatusQuery({
    searchParams: {email},
    defaultErrorHandler: false,
    ...options
});

export const useRequestPasswordReset = createMutation<unknown, {email: string}>({
    method: 'POST',
    path: () => '/authentication/password_reset/',
    body: ({email}) => ({password_reset: [{email}]})
});

export const useResetPassword = createMutation<PasswordResetResponseType, {newPassword: string; ne2Password: string; token: string}>({
    method: 'PUT',
    path: () => '/authentication/password_reset/',
    body: data => ({password_reset: [data]})
});

export const useAcceptInvitation = createMutation<unknown, {name: string; email: string; password: string; token: string}>({
    method: 'POST',
    path: () => '/authentication/invitation/',
    body: data => ({invitation: [data]})
});

export const useCompleteSetup = createMutation<unknown, {name: string; email: string; password: string; blogTitle: string}>({
    method: 'POST',
    path: () => '/authentication/setup/',
    body: data => ({setup: [data]})
});
