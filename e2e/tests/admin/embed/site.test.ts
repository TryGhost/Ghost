import {defineSiteTests} from './site-suite';
import {test} from '@/helpers/playwright';

// Runs the shared site suite against the Ember implementation. The flag is
// pinned off (not just defaulted) so that when embedScreensX eventually GAs,
// this run keeps exercising the Ember screen for as long as it ships — or
// fails loudly once the flag is removed, prompting deletion of this file.
test.use({labs: {embedScreensX: false}});

test.describe('Ghost Admin - Site', () => {
    defineSiteTests();
});
