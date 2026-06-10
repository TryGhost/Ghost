import {defineMemberImpersonationTests} from './impersonation-suite';
import {test} from '@/helpers/playwright';

// Runs the shared member impersonation suite against the React implementation
// (labs flag `memberDetailsX` on). Same page objects and selectors as the
// Ember run in impersonation.test.ts.
test.use({labs: {memberDetailsX: true}});

test.describe('Ghost Admin - Member Impersonation (React)', () => {
    defineMemberImpersonationTests();
});
