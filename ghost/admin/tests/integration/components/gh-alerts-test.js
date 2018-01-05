import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

let notificationsStub = Service.extend({
    alerts: emberA()
});

describe('Integration: Component: gh-alerts', function () {
    setupComponentTest('gh-alerts', {
        integration: true
    });

    beforeEach(function () {
        this.register('service:notifications', notificationsStub);
        this.inject.service('notifications', {as: 'notifications'});

        this.set('notifications.alerts', [
            {message: 'First', type: 'error'},
            {message: 'Second', type: 'warn'}
        ]);
    });

    it('renders', function () {
        this.render(hbs`{{gh-alerts}}`);
        expect(this.$('.gh-alerts').length).to.equal(1);
        expect(this.$('.gh-alerts').children().length).to.equal(2);

        this.set('notifications.alerts', emberA());
        expect(this.$('.gh-alerts').children().length).to.equal(0);
    });

    it('triggers "notify" action when message count changes', function () {
        let expectedCount = 0;

        // test double for notify action
        this.set('notify', count => expect(count).to.equal(expectedCount));

        this.render(hbs`{{gh-alerts notify=(action notify)}}`);

        expectedCount = 3;
        this.get('notifications.alerts').pushObject({message: 'Third', type: 'success'});

        expectedCount = 0;
        this.set('notifications.alerts', emberA());
    });
});
