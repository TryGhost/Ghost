import {defineCustomViewsEditingTests} from './custom-views-editing-suite';
import {test} from '@/helpers/playwright/fixture';

// React implementation run (postsListX on); same suite and selectors.
test.use({labs: {postsListX: true}});

test.describe('Ghost Admin - Custom View Editing (React)', () => {
    defineCustomViewsEditingTests();
});
