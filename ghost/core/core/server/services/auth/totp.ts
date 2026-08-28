import * as otplib from 'otplib';

const totp = otplib.totp.clone({
  digits: 6,
  step: 60,
  window: [10, 10],
});

/**
 * Generate a TOTP token for a user
 * @param userId The user's ID
 * @param secret The admin session secret
 * @param [context] Optional session-specific context to bind the token
 * @returns The generated 6-digit token
 */
export function generate(userId: string, secret: string, context = ''): string {
  return totp.generate(`${secret}${userId}${context}`);
}

/**
 * Verify a TOTP token for a user
 * @param userId The user's ID
 * @param token The token to verify
 * @param secret The admin session secret
 * @param [context] Optional session-specific context to bind the token
 * @returns Whether the token is valid
 */
export function verify(userId: string, token: string, secret: string, context = ''): boolean {
  return totp.check(token, `${secret}${userId}${context}`);
}
