import Ember from 'ember';

export function initialize(instance) {
    var store = instance.container.lookup('service:store'),
        Session = instance.container.lookup('simple-auth-session:main');

    Session.reopen({
        user: Ember.computed(function () {
            return store.findRecord('user', 'me');
        })
    });
}

export default {
    name: 'authentication',
    after: 'ember-data',
    initialize: initialize
};
