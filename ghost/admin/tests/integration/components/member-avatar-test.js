import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: member-avatar', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('member', {
            name: 'Homer Simpson'
        });

        await render(hbs`<MemberAvatar @member={{member}} />`);
        let avatar = this.element;
        expect(avatar).to.exist;
    });
});
