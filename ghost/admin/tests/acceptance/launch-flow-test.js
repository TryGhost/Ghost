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

        await visit('/launch/customise-design');
        expect(currentURL()).to.equal('/signin');

        await visit('/launch/connect-stripe');
        expect(currentURL()).to.equal('/signin');

        await visit('/launch/set-pricing');
        expect(currentURL()).to.equal('/signin');

        await visit('/launch/complete');
        expect(currentURL()).to.equal('/signin');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('can visit /launch', async function () {
            await visit('/launch');
            expect(currentURL()).to.equal('/launch/customise-design');
        });

        it('can visit /launch/customise-design', async function () {
            await visit('/launch/customise-design');
            expect(currentURL()).to.equal('/launch/customise-design');
        });

        it('can visit /launch/connect-stripe', async function () {
            await visit('/launch/connect-stripe');
            expect(currentURL()).to.equal('/launch/connect-stripe');
        });

        it('can visit /launch/set-pricing', async function () {
            await visit('/launch/set-pricing');
            expect(currentURL()).to.equal('/launch/set-pricing');
        });

        it('can visit /launch/complete', async function () {
            await visit('/launch/complete');
            expect(currentURL()).to.equal('/launch/complete');
        });
    });
});
