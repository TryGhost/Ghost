import hbs from 'htmlbars-inline-precompile';
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
});
