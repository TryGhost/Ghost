import {definePublishingTests} from './publishing-suite';
import {test} from '@/helpers/playwright';

// Runs the shared publishing suite against the Ember implementation. The
// flag is pinned off (not just defaulted) so that when editorX eventually
// GAs, this run keeps exercising the Ember screen for as long as it ships —
// or fails loudly once the flag is removed, prompting deletion of this file.
test.use({labs: {editorX: false}});

test.describe('Ghost Admin - Publishing', () => {
    definePublishingTests();
});
