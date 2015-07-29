/* jshint expr:true */
import Ember from 'ember';
import { expect } from 'chai';
import {
    describeComponent,
    it
}
from 'ember-mocha';
import sinon from 'sinon';

describeComponent(
    'gh-alerts',
    'GhAlertsComponent', {
        // specify the other units that are required for this test
        needs: ['component:gh-alert']
    },
    function () {
        beforeEach(function () {
            // Stub the notifications service
            var notifications = Ember.Object.create();
            notifications.alerts = Ember.A();
            notifications.alerts.pushObject({message: 'First', type: 'error'});
            notifications.alerts.pushObject({message: 'Second', type: 'warn'});

            this.subject().set('notifications', notifications);
        });

        it('renders', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');

            expect(this.$().prop('tagName')).to.equal('ASIDE');
            expect(this.$().hasClass('gh-alerts')).to.be.true;
            expect(this.$().children().length).to.equal(2);

            Ember.run(function () {
                component.set('notifications.alerts', Ember.A());
            });

            expect(this.$().children().length).to.equal(0);
        });

        it('triggers "notify" action when message count changes', function () {
            var component = this.subject();

            component.sendAction = sinon.spy();

            component.get('notifications.alerts')
                .pushObject({message: 'New alert', type: 'info'});

            expect(component.sendAction.calledWith('notify', 3)).to.be.true;

            component.set('notifications.alerts', Ember.A());

            expect(component.sendAction.calledWith('notify', 0)).to.be.true;
        });
    }
);
