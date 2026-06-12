import {defineTwoFactorAuthTests} from './two-factor-auth-suite';
import {test} from '@/helpers/playwright';

// Runs the shared two-factor auth suite against the Ember implementation. The
// flag is pinned off (not just defaulted) so that when authX eventually GAs,
// this run keeps exercising the Ember screen for as long as it ships — or
// fails loudly once the flag is removed, prompting deletion of this file.
test.use({labs: {authX: false}});

test.describe('Ghost Admin - Two-Factor Authentication', () => {
    defineTwoFactorAuthTests();
});
