import {defineRestoreTests} from './restore-suite';
import {test} from '@/helpers/playwright';

// Runs the shared restore suite against the React implementation (labs flag
// `restoreX` on). Same page objects and selectors as the Ember run in
// restore.test.ts. Unlike Ember (which only shows a notification), the React
// screen opens the restored draft in the editor.
test.use({labs: {restoreX: true}});

test.describe('Ghost Admin - Restore (React)', () => {
    defineRestoreTests({restoreOpensEditor: true});
});
