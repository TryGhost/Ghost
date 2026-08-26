import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-presence-avatars', function () {
    setupRenderingTest();

    afterEach(function () {
        sinon.restore();
    });

    it('renders capped, accessible avatars with idle and overflow details', async function () {
        const presence = this.owner.lookup('service:presence');
        sinon.stub(presence, 'usersForPost').returns([
            {id: 'u1', name: 'Alex Smith', profileImage: 'alex.jpg', isIdle: false},
            {id: 'u2', name: 'Alex Jones', profileImage: null, isIdle: true},
            {id: 'u3', name: 'Sam Lee', profileImage: null, isIdle: false},
            {id: 'u4', name: 'Taylor Doe', profileImage: null, isIdle: false}
        ]);

        await render(hbs`<GhPresenceAvatars @postId="post-1" @size="sm" />`);

        const avatars = this.element.querySelectorAll('[data-test-presence-avatar]');
        expect(avatars).to.have.length(3);
        expect(avatars[0].getAttribute('aria-label')).to.equal('Alex S.');
        expect(avatars[1].getAttribute('aria-label')).to.equal('Alex J. (idle)');
        expect(avatars[1].getAttribute('data-test-presence-idle')).to.equal('true');
        expect(avatars[0].querySelector('img').getAttribute('alt')).to.equal('');

        const overflow = this.element.querySelector('[data-test-presence-overflow]');
        expect(overflow.textContent.trim()).to.include('+1');
        expect(overflow.getAttribute('aria-label')).to.equal('1 more editors: Taylor');
    });
});
