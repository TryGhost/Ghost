import {defineDisableCommentingTests} from './disable-commenting-suite';
import {test} from '@/helpers/playwright';

// Runs the shared disable commenting suite against the React implementation
// (labs flag `memberDetailsX` on). Same page objects and selectors as the
// Ember run in disable-commenting.test.ts.
test.use({labs: {memberDetailsX: true}});

test.describe('Ghost Admin - Member Detail Disable Commenting (React)', () => {
    defineDisableCommentingTests();
});
