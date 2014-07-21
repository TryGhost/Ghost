import PaginationControllerMixin from 'ghost/mixins/pagination-controller';

var UsersIndexController = Ember.ArrayController.extend(PaginationControllerMixin, {
    init: function () {
        //let the PaginationControllerMixin know what type of model we will be paginating
        //this is necesariy because we do not have access to the model inside the Controller::init method
        this._super({'modelType': 'user'});
    },

    users: Ember.computed.alias('model'),

    activeUsers: Ember.computed.filterBy('users', 'active', true).property('users'),

    invitedUsers: Ember.computed.filterBy('users', 'invited', true).property('users')
});

export default UsersIndexController;
