import {defineCustomViewsTests} from './custom-views-suite';
import {test} from '@/helpers/playwright/fixture';

// Ember implementation run; flag pinned off so a future GA fails loudly.
test.use({labs: {postsListX: false}});

test.describe('Ghost Admin - Custom Views', () => {
    defineCustomViewsTests();
});
