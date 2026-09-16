import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

let notificationsStub = Service.extend({
    notifications: emberA()
});

describe('Integration: Component: gh-notifications', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('service:notifications', notificationsStub);
        let notifications = this.owner.lookup('service:notifications');

        notifications.set('notifications', [
            {message: 'First', type: 'error'},
            {message: 'Second', type: 'warn'}
        ]);
    });

    it('renders', async function () {
        await render(hbs`<GhNotifications />`);
        expect(find('.gh-notifications')).to.exist;

        expect(find('.gh-notifications').children.length).to.equal(2);

        let notifications = this.owner.lookup('service:notifications');
        notifications.set('notifications', emberA());
        await settled();
        expect(find('.gh-notifications').children.length).to.equal(0);
    });
});
