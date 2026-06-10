import {defineResetPasswordTests} from './reset-password-suite';
import {test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

// Completing a password reset rotates the admin session server-side, which
// invalidates the per-file cached authenticated session for later tests in
// the same file — so this file needs a fresh environment per test.
usePerTestIsolation();

// Runs the shared password reset suite against the Ember implementation. The
// flag is pinned off (not just defaulted) so that when authX eventually GAs,
// this run keeps exercising the Ember screen for as long as it ships — or
// fails loudly once the flag is removed, prompting deletion of this file.
test.use({labs: {authX: false}});

test.describe('Ghost Admin - Reset Password', () => {
    defineResetPasswordTests();
});
