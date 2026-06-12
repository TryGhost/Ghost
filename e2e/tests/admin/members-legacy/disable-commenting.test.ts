import {defineDisableCommentingTests} from './disable-commenting-suite';
import {test} from '@/helpers/playwright';

// Runs the shared disable commenting suite against the Ember implementation
// (labs flag `memberDetailsX` pinned off).
test.use({labs: {memberDetailsX: false}});

test.describe('Ghost Admin - Member Detail Disable Commenting', () => {
    defineDisableCommentingTests();
});
