import * as errors from '@tryghost/errors';
// @ts-expect-error This module lacks type definitions.
import * as security from '@tryghost/security';
import { validatePassword } from './validate-password';

export const generatePassword = (email: string): string => {
  for (let i = 0; i < 1000; i++) {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const password = security.identifier.uid(50);
    if (validatePassword(password, email).isValid) {
      return password;
    }
  }

  throw new errors.InternalServerError({
    message: 'Unable to generate a valid password after 1000 iterations',
    context: 'generatePassword',
  });
};
