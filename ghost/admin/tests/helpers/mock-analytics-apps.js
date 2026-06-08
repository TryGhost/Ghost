import config from 'ghost-admin/config/environment';

export function mockAnalyticsApps() {
    // Mock the asset delivery config for stats component
    config.statsFilename = 'stats.js';
    config.statsHash = 'development';
    
    // Mock the stats component to prevent actual loading
    window['@tryghost/stats'] = {
        AdminXApp: function MockStatsComponent() {
            return '<div data-test-stats-component>Mock Stats Component</div>';
        }
    };
    
    // Mock the posts component as well
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
    delete window['@tryghost/stats'];
    delete window['@tryghost/posts'];
    delete config.statsFilename;
    delete config.statsHash;
    delete config.postsFilename;
    delete config.postsHash;
}