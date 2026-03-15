import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentURL} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Analytics Navigation', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    function updateUserRole(server, roleName) {
        let role = server.create('role', {name: roleName});
        server.db.users.update(1, {roles: [role]});
        return role;
    }
    
    async function clickPostAnalytics(postId) {
        // The analytics link is in the post row, find the specific one for this post
        let postRow = document.querySelector(`[data-test-post-id="${postId}"]`);
        expect(postRow, `Post row for post ${postId} should exist`).to.exist;
        
        // Find the analytics link within this post's row
        let analyticsLink = postRow.parentElement.querySelector('.gh-post-list-cta.stats');
        expect(analyticsLink, `Analytics link for post ${postId} should exist`).to.exist;
        await click(analyticsLink);
    }
    
    function createPostWithEmail(server, overrides = {}) {
        // Create an email record first
        let email = server.create('email', {
            emailCount: 100,
            trackOpens: true,
            ...(overrides.email || {})
        });

        return server.create('post', {
            status: 'published',
            title: 'Test Post for Analytics',
            email: email,
            hasBeenEmailed: true,
            ...overrides
        });
    }
    
    async function expectPostAnalyticsRoute(postId) {
        expect(currentURL()).to.equal(`/posts/analytics/${postId}`);
    }
    
    async function expectStatsAnalyticsRoute() {
        expect(currentURL()).to.equal('/analytics');
    }

    beforeEach(async function () {
        mockAnalyticsApps();

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {id: '1', roles: [role]});
        await authenticateSession();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    describe('Stats-X route (/analytics)', function () {
        it('allows access', async function () {
            await visit('/analytics');
            await expectStatsAnalyticsRoute();
        });

        it('redirects contributors to posts', async function () {
            updateUserRole(this.server, 'Contributor');

            await visit('/analytics');
            expect(currentURL()).to.equal('/posts');
        });

        it('redirects non-admin users to site', async function () {
            updateUserRole(this.server, 'Editor');

            await visit('/analytics');
            expect(currentURL()).to.equal('/site');
        });
    });

    describe('Posts-X route (/posts/analytics/:post_id)', function () {
        it('allows access', async function () {
            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/${post.id}`);
            await expectPostAnalyticsRoute(post.id);
        });

        it('redirects contributors to posts', async function () {
            updateUserRole(this.server, 'Contributor');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/${post.id}`);
            expect(currentURL()).to.equal('/posts');
        });
    });

    describe('Posts Index Navigation', function () {
        it('navigates to posts-x route when clicking on post analytics', async function () {
            let post = createPostWithEmail(this.server);

            await visit('/posts');
            await clickPostAnalytics(post.id);
            await expectPostAnalyticsRoute(post.id);
        });
    });
});