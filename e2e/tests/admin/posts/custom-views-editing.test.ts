import {defineCustomViewsEditingTests} from './custom-views-editing-suite';
import {test} from '@/helpers/playwright/fixture';

// Ember implementation run; flag pinned off so a future GA fails loudly.
test.use({labs: {postsListX: false}});

test.describe('Ghost Admin - Custom View Editing', () => {
    defineCustomViewsEditingTests();
});
