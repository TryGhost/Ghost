import {definePostUpdatesTests} from './post-updates-suite';
import {test} from '@/helpers/playwright';

// Runs the shared post updates suite against the React implementation (labs
// flag `editorX` on). Same page objects and selectors as the Ember run in
// post-updates.test.ts. NOTE: the React editor does not exist yet, so this
// run is expected to fail until it ships behind the flag.
test.use({labs: {editorX: true}});

test.describe('Ghost Admin - Post Updates (React)', () => {
    definePostUpdatesTests();
});
