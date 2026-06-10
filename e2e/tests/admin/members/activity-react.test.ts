import {defineMembersActivityTests} from './activity-suite';
import {test} from '@/helpers/playwright';

// Runs the shared members activity suite against the React implementation
// (labs flag `memberDetailsX` on). Same page objects and selectors as the
// Ember run in activity.test.ts.
test.use({labs: {memberDetailsX: true}});

test.describe('Ghost Admin - Members Activity (React)', () => {
    defineMembersActivityTests();
});
