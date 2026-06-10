import {defineMemberActivityEventsTests} from './member-activity-events-suite';
import {test} from '@/helpers/playwright';

// Runs the shared member activity events suite against the Ember
// implementation (labs flag `memberDetailsX` pinned off).
test.use({labs: {memberDetailsX: false}});

test.describe('Ghost Admin - Member Activity Events', () => {
    defineMemberActivityEventsTests();
});
