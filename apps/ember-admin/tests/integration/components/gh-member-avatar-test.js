import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-member-avatar', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('member', {
            get(key) {
                if (key === 'name') {
                    return 'Homer Simpson';
                }
            }
        });

        await render(hbs`<GhMemberAvatar @member={{member}} />`);
        let avatar = this.element;
        expect(avatar).to.exist;
    });
});
