define("ghost/controllers/modals/signin", 
  ["ghost/controllers/signin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var SigninController = __dependency1__["default"];

    __exports__["default"] = SigninController.extend({
        needs: 'application',

        identification: Ember.computed('session.user.email', function () {
            return this.get('session.user.email');
        }),

        actions: {
            authenticate: function () {
                var appController = this.get('controllers.application'),
                    self = this;

                appController.set('skipAuthSuccessHandler', true);

                this._super().then(function () {
                    self.send('closeModal');
                    self.notifications.showSuccess('Login successful.');
                    self.set('password', '');
                }).finally(function () {
                    appController.set('skipAuthSuccessHandler', undefined);
                });
            },

            confirmAccept: function () {
                this.send('validateAndAuthenticate');
            }
        }
    });
  });