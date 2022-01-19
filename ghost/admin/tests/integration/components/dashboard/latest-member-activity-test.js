import hbs from 'htmlbars-inline-precompile';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, findAll, render} from '@ember/test-helpers';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: <Dashboard::LatestMemberActivity>', function () {
    const hooks = setupRenderingTest();
    setupMirage(hooks);

    it('renders with no activities', async function () {
        await render(hbs(`<Dashboard::LatestMemberActivity />`));

        expect(find('[data-test-dashboard-member-activity]')).to.exist;
        expect(find('[data-test-no-member-activities]')).to.exist;
    });

    it('renders 5 latest activities', async function () {
        this.server.createList('member-activity-event', 10);

        await render(hbs(`<Dashboard::LatestMemberActivity />`));

        expect(find('[data-test-dashboard-member-activity]')).to.exist;
        expect(find('[data-test-no-member-activities]')).to.not.exist;

        expect(findAll('[data-test-dashboard-member-activity-item]').length).to.equal(5);
    });

    it('renders nothing when owner has not completed launch', async function () {
        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});
        await authenticateSession();
        const sessionService = this.owner.lookup('service:session');
        await sessionService.populateUser();

        this.server.create('setting', {
            key: 'editor_is_launch_complete',
            value: false,
            group: 'editor'
        });
        const settingsService = this.owner.lookup('service:settings');
        await settingsService.fetch();

        await render(hbs(`<Dashboard::LatestMemberActivity />`));

        expect(find('[data-test-dashboard-member-activity]')).to.not.exist;
    });
});
