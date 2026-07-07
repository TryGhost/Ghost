import config from 'ghost-admin/config/environment';

export function mockAnalyticsApps() {
    // Mock the posts component to prevent actual loading
    config.postsFilename = 'posts.js';
    config.postsHash = 'development';
    window['@tryghost/posts'] = {
        AdminXApp: function MockPostsComponent() {
            return '<div data-test-posts-component>Mock Posts Component</div>';
        }
    };
}

export function cleanupMockAnalyticsApps() {
    // Clean up mocks
    delete window['@tryghost/posts'];
    delete config.postsFilename;
    delete config.postsHash;
}