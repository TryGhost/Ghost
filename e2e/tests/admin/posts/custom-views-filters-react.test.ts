import {defineCustomViewsFiltersTests} from './custom-views-filters-suite';
import {test} from '@/helpers/playwright/fixture';

// React implementation run (postsListX on); same suite and selectors.
test.use({labs: {postsListX: true}});

test.describe('Ghost Admin - Custom View Filters (React)', () => {
    defineCustomViewsFiltersTests();
});
