import {authenticateSession} from 'ember-simple-auth/test-support';
import {currentURL, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Launch flow', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    it('is not accessible when logged out', async function () {
        await visit('/launch');
        expect(currentURL()).to.equal('/signin');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('can visit /launch', async function () {
            await visit('/launch');
            expect(currentURL()).to.equal('/launch');
        });
    });
});
