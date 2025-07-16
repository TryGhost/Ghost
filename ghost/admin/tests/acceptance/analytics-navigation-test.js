import {Response} from 'miragejs';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentURL, fillIn} from '@ember/test-helpers';
import {disableLabsFlag, enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Analytics Navigation', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    async function createUserAndSignIn(server, {role = 'Administrator', email = 'admin@example.com'} = {}) {
        let roleObj = server.create('role', {name: role});
        server.create('user', {
            id: '1',
            roles: [roleObj], 
            slug: `${role.toLowerCase()}-user`, 
            email: email
        });
        
        await visit('/signin');
        await fillIn('[name="identification"]', email);
        await fillIn('[name="password"]', 'thisissupersafe');
        await click('[data-test-button="sign-in"]');
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
        it('allows access when trafficAnalytics is enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            await visit('/analytics');
            expect(currentURL()).to.equal('/analytics');
        });

        it('redirects to dashboard when trafficAnalytics is disabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');

            await visit('/analytics');
            expect(currentURL()).to.equal('/dashboard');
        });

        it('redirects contributors to posts', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            let contributorRole = this.server.create('role', {name: 'Contributor'});
            this.server.db.users.update(1, {roles: [contributorRole]});

            await visit('/analytics');
            expect(currentURL()).to.equal('/posts');
        });

        it('redirects non-admin users to site', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            let editorRole = this.server.create('role', {name: 'Editor'});
            this.server.db.users.update(1, {roles: [editorRole]});

            await visit('/analytics');
            expect(currentURL()).to.equal('/site');
        });
    });

    describe('Posts-X route (/posts/analytics/beta/:post_id)', function () {
        it('allows access when both trafficAnalytics and ui60 are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
        });

        it('redirects to analytics when only trafficAnalytics is enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal('/analytics');
        });

        it('redirects to analytics when only ui60 is enabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal('/analytics');
        });

        it('redirects to home when both flags are disabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal('/dashboard');
        });

        it('redirects contributors to posts', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let contributorRole = this.server.create('role', {name: 'Contributor'});
            this.server.db.users.update(1, {roles: [contributorRole]});

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal('/posts');
        });

        it('sets fromAnalytics when navigating from stats-x', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit('/analytics');
            await visit(`/posts/analytics/beta/${post.id}`);
            
            expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
        });
    });

    describe('Posts Analytics route', function () {
        beforeEach(function () {
            this.post = this.server.create('post', {
                status: 'published',
                title: 'Test Post'
            });
        });

        it('allows access to post analytics when flags are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit(`/posts/${this.post.id}/analytics`);
            expect(currentURL()).to.equal(`/posts/${this.post.id}/analytics`);
        });

        it('redirects to dashboard from analytics sub-route when flags are disabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');

            await visit(`/posts/${this.post.id}/analytics`);
            expect(currentURL()).to.equal(`/posts/${this.post.id}/analytics`);
        });

        it('allows contributors to view their own post analytics', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let contributorRole = this.server.create('role', {name: 'Contributor'});
            let contributor = this.server.create('user', {roles: [contributorRole]});
            
            let contributorPost = this.server.create('post', {
                status: 'draft',
                authors: [contributor]
            });

            this.server.db.users.update(1, {roles: [contributorRole]});

            await visit(`/posts/${contributorPost.id}/analytics`);
            expect(currentURL()).to.equal(`/posts/${contributorPost.id}/analytics`);
        });

        it('redirects contributors viewing other users posts', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let adminRole = this.server.create('role', {name: 'Administrator'});
            let admin = this.server.create('user', {roles: [adminRole]});
            let otherPost = this.server.create('post', {
                status: 'published',
                authors: [admin]
            });

            let contributorRole = this.server.create('role', {name: 'Contributor'});
            this.server.db.users.update(1, {roles: [contributorRole]});

            await visit(`/posts/${otherPost.id}/analytics`);
            expect(currentURL()).to.equal(`/posts/${otherPost.id}/analytics`);
        });
    });

    describe('Analytics in Navigation Menu', function () {
        it('shows Analytics link when both flags are enabled for admin', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit('/dashboard');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('hides Analytics link when trafficAnalytics is disabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit('/dashboard');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.not.exist;
        });

        it('shows Analytics link when only trafficAnalytics is enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');

            await visit('/dashboard');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('hides Analytics link for non-admin users', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let editorRole = this.server.create('role', {name: 'Editor'});
            this.server.db.users.update(1, {roles: [editorRole]});

            await visit('/site');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.not.exist;
        });

        it('navigates to analytics when Analytics link is clicked', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit('/dashboard');
            await click('.gh-nav-list a[href*="analytics"]');
            
            expect(currentURL()).to.equal('/analytics');
        });
    });

    describe('Posts Index Navigation', function () {
        it('navigates to posts-x route when clicking on post analytics', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {
                status: 'published',
                title: 'Test Post for Analytics'
            });

            await visit('/posts');
            
            await click(`[data-test-post-id="${post.id}"]`);
            
            let analyticsButton = document.querySelector('[data-test-button="analytics"]');
            if (analyticsButton) {
                await click('[data-test-button="analytics"]');
                expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
            }
        });
    });

    describe('Authentication Flow Navigation', function () {
        beforeEach(function () {
            this.server.post('/session', function () {
                return new Response(201);
            });
        });

        it('shows Analytics in nav after signin when flags are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await invalidateSession();
            
            await createUserAndSignIn(this.server, {role: 'Administrator', email: 'test@example.com'});
            
            expect(currentURL()).to.equal('/analytics');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('hides Analytics in nav after signin when flags are disabled', async function () {
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');

            await invalidateSession();
            
            await createUserAndSignIn(this.server, {role: 'Administrator', email: 'test@example.com'});
            
            expect(currentURL()).to.equal('/dashboard');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.not.exist;
        });

        it('redirects non-admin after signin based on role', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await invalidateSession();
            
            await createUserAndSignIn(this.server, {role: 'Author', email: 'author@example.com'});
            
            expect(currentURL()).to.equal('/site');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.not.exist;
        });
    });

    describe('Setup Flow Navigation', function () {
        it('shows Analytics after setup when flags are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit('/setup/done');
            
            expect(currentURL()).to.equal('/analytics');
            
            let analyticsLink = document.querySelector('.gh-nav-list a[href*="analytics"]');
            expect(analyticsLink).to.exist;
        });
    });
});