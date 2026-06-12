import {defineTagDetailsTests} from './tag-details-suite';
import {test} from '@/helpers/playwright';

// Runs the shared tag detail suite against the Ember implementation. The flag
// is pinned off (not just defaulted) so that when tagDetailsX eventually GAs,
// this run keeps exercising the Ember screen for as long as it ships — or
// fails loudly once the flag is removed, prompting deletion of this file.
test.use({labs: {tagDetailsX: false}});

test.describe('Ghost Admin - Tags Editor', () => {
    defineTagDetailsTests();
});
