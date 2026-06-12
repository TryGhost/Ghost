import {defineSiteTests} from './site-suite';
import {test} from '@/helpers/playwright';

// Runs the shared site suite against the React implementation (labs flag
// `embedScreensX` on). Same page object and selectors as the Ember run in
// site.test.ts.
test.use({labs: {embedScreensX: true}});

test.describe('Ghost Admin - Site (React)', () => {
    defineSiteTests();
});
