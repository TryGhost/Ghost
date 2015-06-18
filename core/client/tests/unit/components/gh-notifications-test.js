/* jshint expr:true */
import Ember from 'ember';
import { expect } from 'chai';
import {
    describeComponent,
    it
}
from 'ember-mocha';

describeComponent(
    'gh-notifications',
    'GhNotificationsComponent', {
        // specify the other units that are required for this test
        needs: ['component:gh-notification']
    },
    function () {
        beforeEach(function () {
            // Stub the notifications service
            var notifications = Ember.Object.create();
            notifications.notifications = Ember.A();
            notifications.notifications.pushObject({message: 'First', type: 'error'});
            notifications.notifications.pushObject({message: 'Second', type: 'warn'});

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
            expect(this.$().hasClass('gh-notifications')).to.be.true;
            expect(this.$().children().length).to.equal(2);

            Ember.run(function () {
                component.set('notifications.notifications', Ember.A());
            });

            expect(this.$().children().length).to.equal(0);
        });
    }
);
