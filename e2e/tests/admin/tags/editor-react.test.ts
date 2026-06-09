import {defineTagDetailsTests} from './tag-details-suite';
import {test} from '@/helpers/playwright';

// Runs the shared tag detail suite against the React implementation
// (labs flag `tagDetailsX` on). Same page objects and selectors as the
// Ember run in editor.test.ts.
test.use({labs: {tagDetailsX: true}});

test.describe('Ghost Admin - Tags Editor (React)', () => {
    defineTagDetailsTests();
});
