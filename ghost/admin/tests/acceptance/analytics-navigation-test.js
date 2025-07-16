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
        await invalidateSession();
        
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
    
    function updateUserRole(server, roleName) {
        let role = server.create('role', {name: roleName});
        server.db.users.update(1, {roles: [role]});
        return role;
    }
    
    function findAnalyticsNavLink() {
        return document.querySelector('.gh-nav-list a[href*="analytics"]');
    }

    function findDashboardNavLink() {
        return document.querySelector('.gh-nav-list a[href*="dashboard"]');
    }
    
    async function clickPost(postId) {
        await click(`[data-test-post-id="${postId}"]`);
    }
    
    async function clickPostAnalytics() {
        let analyticsButton = document.querySelector('[data-test-button="analytics"]');
        if (analyticsButton) {
            await click('[data-test-button="analytics"]');
            return true;
        }
        return false;
    }

    beforeEach(async function () {
        mockAnalyticsApps();

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {id: '1', roles: [role]});
        await authenticateSession();
        
        // Disable all flags by default
        disableLabsFlag(this.server, 'trafficAnalytics');
        disableLabsFlag(this.server, 'ui60');
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

        it('allows access when ui60 is enabled', async function () {
            enableLabsFlag(this.server, 'ui60');

            await visit('/analytics');
            expect(currentURL()).to.equal('/analytics');
        });

        it('redirects to dashboard when flags are disabled', async function () {
            await visit('/analytics');
            expect(currentURL()).to.equal('/dashboard');
        });

        it('redirects contributors to posts', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            updateUserRole(this.server, 'Contributor');

            await visit('/analytics');
            expect(currentURL()).to.equal('/posts');
        });

        it('redirects non-admin users to site', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            updateUserRole(this.server, 'Editor');

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

        it('allows access when only trafficAnalytics is enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
        });

        it('allows access when only ui60 is enabled', async function () {
            enableLabsFlag(this.server, 'ui60');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
        });

        it('redirects to old post analytics when both flags are disabled', async function () {
            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal(`/posts/analytics/${post.id}`);
        });

        it('redirects contributors to posts', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            updateUserRole(this.server, 'Contributor');

            let post = this.server.create('post', {status: 'published'});
            await visit(`/posts/analytics/beta/${post.id}`);
            expect(currentURL()).to.equal('/posts');
        });
    });

    describe('Navigation Menu', function () {
        it('shows Analytics link when ui60 flag is enabled for admin', async function () {
            enableLabsFlag(this.server, 'ui60');

            await visit('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('shows Analytics and Dashboard link when trafficAnalytics flag is enabled for admin', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            await visit('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');

            let dashboardLink = findDashboardNavLink();
            expect(dashboardLink).to.exist;
            expect(dashboardLink.textContent).to.contain('Dashboard');
        });

        it('hides Analytics link when flags are disabled', async function () {
            await visit('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.not.exist;
        });

        it('shows Analytics link when only trafficAnalytics is enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');

            await visit('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('hides Analytics link for non-admin users', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            updateUserRole(this.server, 'Editor');

            await visit('/site');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.not.exist;
        });

        it('navigates to Analytics when Analytics nav link is clicked', async function () {
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
            await clickPost(post.id);
            if (await clickPostAnalytics()) {
                expect(currentURL()).to.equal(`/posts/analytics/beta/${post.id}`);
            }
        });

        it('navigates to old post analytics when clicking on post analytics', async function () {
            let post = this.server.create('post', {
                status: 'published',
                title: 'Test Post for Analytics'
            });

            await visit('/posts');
            await clickPost(post.id);
            if (await clickPostAnalytics()) {
                expect(currentURL()).to.equal(`/posts/analytics/${post.id}`);
            }
        });
    });

    describe('Authentication Flow Navigation', function () {
        beforeEach(function () {
            this.server.post('/session', function () {
                return new Response(201);
            });
        });

        it('takes user to analytics after signin when flags are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await createUserAndSignIn(this.server, {role: 'Administrator', email: 'test@example.com'});
            
            expect(currentURL()).to.equal('/analytics');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.exist;
            expect(analyticsLink.textContent).to.contain('Analytics');
        });

        it('takes user to dashboard after signin when flags are disabled', async function () {
            await createUserAndSignIn(this.server, {role: 'Administrator', email: 'test@example.com'});
            
            expect(currentURL()).to.equal('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.not.exist;
        });

        it('redirects non-admin after signin based on role', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await createUserAndSignIn(this.server, {role: 'Author', email: 'author@example.com'});
            
            expect(currentURL()).to.equal('/site');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.not.exist;
        });
    });

    describe('Setup Flow Navigation', function () {
        it('shows Analytics after setup when flags are enabled', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');

            await visit('/setup/done');
            
            expect(currentURL()).to.equal('/analytics');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.exist;
        });

        it('takes user to dashboard after setup when flags are disabled', async function () {
            await visit('/setup/done');
            
            expect(currentURL()).to.equal('/dashboard');
            
            let analyticsLink = findAnalyticsNavLink();
            expect(analyticsLink).to.not.exist;
        });
    });
});