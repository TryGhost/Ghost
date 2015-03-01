define("ghost/mixins/current-user-settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var CurrentUserSettings = Ember.Mixin.create({
        currentUser: function () {
            return this.store.find('user', 'me');
        },

        transitionAuthor: function () {
            var self = this;

            return function (user) {
                if (user.get('isAuthor')) {
                    return self.transitionTo('settings.users.user', user);
                }

                return user;
            };
        },

        transitionEditor: function () {
            var self = this;

            return function (user) {
                if (user.get('isEditor')) {
                    return self.transitionTo('settings.users');
                }

                return user;
            };
        }
    });

    __exports__["default"] = CurrentUserSettings;
  });