/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const {Service, run} = Ember;
const emberA = Ember.A;

let notificationsStub = Service.extend({
    notifications: emberA()
});

describeComponent(
    'gh-notifications',
    'Integration: Component: gh-notifications',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            this.register('service:notifications', notificationsStub);
            this.inject.service('notifications', {as: 'notifications'});

            this.set('notifications.notifications', [
                {message: 'First', type: 'error'},
                {message: 'Second', type: 'warn'}
            ]);
        });

        it('renders', function () {
            this.render(hbs`{{gh-notifications}}`);
            expect(this.$('.gh-notifications').length).to.equal(1);

            expect(this.$('.gh-notifications').children().length).to.equal(2);

            this.set('notifications.notifications', emberA());
            expect(this.$('.gh-notifications').children().length).to.equal(0);
        });
    }
);
