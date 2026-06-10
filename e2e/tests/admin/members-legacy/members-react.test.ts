import {defineMemberDetailsTests} from './member-details-suite';
import {test} from '@/helpers/playwright';

// Runs the shared member detail suite against the React implementation
// (labs flag `memberDetailsX` on). Same page objects and selectors as the
// Ember run in members.test.ts.
test.use({labs: {memberDetailsX: true}});

test.describe('Ghost Admin - Member Details (React)', () => {
    defineMemberDetailsTests();
});
