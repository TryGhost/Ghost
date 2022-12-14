import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {find, findAll, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

let notificationsStub = Service.extend({
    alerts: emberA()
});

describe('Integration: Component: gh-alerts', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('service:notifications', notificationsStub);
        let notifications = this.owner.lookup('service:notifications');

        notifications.set('alerts', [
            {message: 'First', type: 'error'},
            {message: 'Second', type: 'warn'}
        ]);
    });

    it('renders', async function () {
        let notifications = this.owner.lookup('service:notifications');

        await render(hbs`{{gh-alerts}}`);
        expect(findAll('.gh-alerts').length).to.equal(1);
        expect(find('.gh-alerts').children.length).to.equal(2);

        notifications.set('alerts', emberA());
        await settled();
        expect(find('.gh-alerts').children.length).to.equal(0);
    });

    it('triggers "notify" action when message count changes', async function () {
        let notifications = this.owner.lookup('service:notifications');
        let expectedCount = 0;

        // test double for notify action
        this.set('notify', count => expect(count).to.equal(expectedCount));

        await render(hbs`{{gh-alerts notify=(action notify)}}`);

        expectedCount = 3;
        notifications.alerts.pushObject({message: 'Third', type: 'success'});
        await settled();

        expectedCount = 0;
        notifications.set('alerts', emberA());
        await settled();
    });
});
