import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Mentions', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/mentions');
        expect(currentURL()).to.equal('/signin');
    });

    describe('as admin', function () {
        beforeEach(async function () {
            this.server.loadFixtures('configs');
            this.server.loadFixtures('settings');
    
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});
            enableLabsFlag(this.server, 'webmentions');
            return await authenticateSession();
        });
        it('can render mentions page', async function () {
            await visit('/mentions');
            expect(currentURL(), 'currentURL').to.equal('/mentions');
        });
    });
});

