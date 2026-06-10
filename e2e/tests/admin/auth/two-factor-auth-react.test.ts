import {defineTwoFactorAuthTests} from './two-factor-auth-suite';
import {test} from '@/helpers/playwright';

// Runs the shared two-factor auth suite against the React implementation
// (labs flag `authX` on). Same page objects and selectors as the Ember run in
// two-factor-auth.test.ts. NOTE: the authX flag does not exist yet, so this
// run still exercises the Ember screen until the React screens ship behind
// the flag.
test.use({labs: {authX: true}});

test.describe('Ghost Admin - Two-Factor Authentication (React)', () => {
    defineTwoFactorAuthTests();
});
