import moment from 'moment-timezone';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Members activity', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects when not authenticated', async function () {
        await invalidateSession();
        await visit('/members-activity');
        expect(currentURL()).to.equal('/signin');
    });

    it('redirects non-admins', async function () {
        await invalidateSession();

        const role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/members-activity');
        expect(currentURL()).to.equal('/site');
    });

    describe('as admin', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });
    });

    describe('as owner', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });
    });

    // describe('members activity filter', function () {
    //     beforeEach(async function () {
    //         const role = this.server.create('role', {name: 'Administrator'});
    //         await this.server.create('user', {roles: [role]});

    //         await authenticateSession();
    //         await this.server.createList('member-activity-event', 10, {createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss')});
    //     });

    //     it('renders', async function () {
    //         await visit('/members-activity');
    //         expect(currentURL()).to.equal('/members-activity');
    //     });
    // });
});
