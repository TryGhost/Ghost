import {definePostsListTests} from './list-suite';
import {test} from '@/helpers/playwright';

// Runs the shared posts/pages list suite against the React implementation
// (labs flag `postsListX` on). Same page objects and selectors as the Ember
// run in list.test.ts.
test.use({labs: {postsListX: true}});

test.describe('Ghost Admin - Posts List (React)', () => {
    definePostsListTests();
});
