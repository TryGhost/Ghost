import {definePostsListTests} from './list-suite';
import {test} from '@/helpers/playwright';

// Runs the shared posts/pages list suite against the Ember implementation.
// The flag is pinned off (not just defaulted) so that when postsListX
// eventually GAs, this run keeps exercising the Ember screen for as long as
// it ships — or fails loudly once the flag is removed.
test.use({labs: {postsListX: false}});

test.describe('Ghost Admin - Posts List', () => {
    definePostsListTests();
});
