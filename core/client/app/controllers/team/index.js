import Ember from 'ember';
import PaginationControllerMixin from 'ghost/mixins/pagination-controller';

export default Ember.Controller.extend(PaginationControllerMixin, {
    init: function () {
        // let the PaginationControllerMixin know what type of model we will be paginating
        // this is necessary because we do not have access to the model inside the Controller::init method
        this._super({modelType: 'user'});
    },

    users: Ember.computed.alias('model'),

    activeUsers: Ember.computed.filter('users', function (user) {
        return /^active|warn-[1-4]|locked$/.test(user.get('status'));
    }),

    invitedUsers: Ember.computed.filter('users', function (user) {
        var status = user.get('status');

        return status === 'invited' || status === 'invited-pending';
    })
});
