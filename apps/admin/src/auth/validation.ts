// Loose email check, equivalent in spirit to the validator the Ember auth
// screens use: the API performs the authoritative validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_PATTERN.test(email.trim());
}

// Matches the API's password length requirement (core's password validation).
export const MIN_PASSWORD_LENGTH = 10;
