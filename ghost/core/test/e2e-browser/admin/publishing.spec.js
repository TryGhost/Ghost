const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

test.describe('Updating post access', () => {
    // Timezone display test moved to ghost/admin/tests/acceptance/editor/post-settings-menu-test.js

    // Default recipient settings test moved to ghost/admin/tests/acceptance/editor/publish-flow-test.js
});

// Delete post tests moved to e2e/tests/admin/posts/publishing.test.ts
