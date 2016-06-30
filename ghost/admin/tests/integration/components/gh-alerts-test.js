/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import run from 'ember-runloop';
import Service from 'ember-service';
import {A as emberA} from 'ember-array/utils';

let notificationsStub = Service.extend({
    alerts: emberA()
});

describeComponent(
    'gh-alerts',
    'Integration: Component: gh-alerts',
    {
        integration: true
    },
    function () {
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
            this.set('notify', (count) => expect(count).to.equal(expectedCount));

            this.render(hbs`{{gh-alerts notify=(action notify)}}`);

            expectedCount = 3;
            this.get('notifications.alerts').pushObject({message: 'Third', type: 'success'});

            expectedCount = 0;
            this.set('notifications.alerts', emberA());
        });
    }
);
