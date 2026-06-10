import {defineMemberActivityEventsTests} from './member-activity-events-suite';
import {test} from '@/helpers/playwright';

// Runs the shared member activity events suite against the React
// implementation (labs flag `memberDetailsX` on). Same page objects and
// selectors as the Ember run in member-activity-events.test.ts.
test.use({labs: {memberDetailsX: true}});

test.describe('Ghost Admin - Member Activity Events (React)', () => {
    defineMemberActivityEventsTests();
});
