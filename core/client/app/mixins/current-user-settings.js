import Ember from 'ember';

export default Ember.Mixin.create({
    transitionAuthor: function () {
        var self = this;

        return function (user) {
            if (user.get('isAuthor')) {
                return self.transitionTo('team.user', user);
            }

            return user;
        };
    },

    transitionEditor: function () {
        var self = this;

        return function (user) {
            if (user.get('isEditor')) {
                return self.transitionTo('team');
            }

            return user;
        };
    }
});
