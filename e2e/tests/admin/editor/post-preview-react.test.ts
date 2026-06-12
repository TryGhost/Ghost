import {definePostPreviewTests} from './post-preview-suite';
import {test} from '@/helpers/playwright';

// Runs the shared post preview suite against the React implementation (labs
// flag `editorX` on). Same page objects and selectors as the Ember run in
// post-preview.test.ts. NOTE: the React editor does not exist yet, so this
// run is expected to fail until it ships behind the flag.
test.use({labs: {editorX: true}});

test.describe('Ghost Admin - Post Preview (React)', () => {
    definePostPreviewTests();
});
