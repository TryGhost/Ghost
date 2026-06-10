import {defineSigninTests} from './signin-suite';
import {test} from '@/helpers/playwright';

// Runs the shared signin suite against the React implementation (labs flag
// `authX` on). Same page objects and selectors as the Ember run in
// signin.test.ts. NOTE: the authX flag does not exist yet, so this run still
// exercises the Ember screen until the React signin ships behind the flag.
test.use({labs: {authX: true}});

test.describe('Ghost Admin - Signin (React)', () => {
    defineSigninTests();
});
