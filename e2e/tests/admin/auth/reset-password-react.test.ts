import {defineResetPasswordTests} from './reset-password-suite';
import {test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

// Completing a password reset rotates the admin session server-side, which
// invalidates the per-file cached authenticated session for later tests in
// the same file — so this file needs a fresh environment per test.
usePerTestIsolation();

// Runs the shared password reset suite against the React implementation (labs
// flag `authX` on). Same page objects and selectors as the Ember run in
// reset-password.test.ts. NOTE: the authX flag does not exist yet, so this
// run still exercises the Ember screen until the React screens ship behind
// the flag.
test.use({labs: {authX: true}});

test.describe('Ghost Admin - Reset Password (React)', () => {
    defineResetPasswordTests();
});
