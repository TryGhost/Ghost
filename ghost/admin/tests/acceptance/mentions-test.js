import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {currentURL, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Mentions', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        mockAnalyticsApps();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/mentions');
        expect(currentURL()).to.equal('/signin');
    });

    describe('as admin', function () {
        beforeEach(async function () {
            enableLabsFlag(this.server, 'webmentions');
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});
            await authenticateSession();
        });
        
        it('can render mentions page', async function () {
            await visit('/mentions');
            expect(currentURL(), 'currentURL').to.equal('/mentions');
        });
    });
});

