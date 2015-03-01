define("ghost/routes/signup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-signup'],
        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.notifications.showWarn('You need to sign out to register as a new user.', {delayed: true});
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        model: function (params) {
            var self = this,
                tokenText,
                email,
                model = Ember.Object.create(),
                re = /^(?:[A-Za-z0-9_\-]{4})*(?:[A-Za-z0-9_\-]{2}|[A-Za-z0-9_\-]{3})?$/;

            return new Ember.RSVP.Promise(function (resolve) {
                if (!re.test(params.token)) {
                    self.notifications.showError('Invalid token.', {delayed: true});

                    return resolve(self.transitionTo('signin'));
                }

                tokenText = atob(params.token);
                email = tokenText.split('|')[1];

                model.set('email', email);
                model.set('token', params.token);

                return ic.ajax.request({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        email: email
                    }
                }).then(function (response) {
                    if (response && response.invitation && response.invitation[0].valid === false) {
                        self.notifications.showError('The invitation does not exist or is no longer valid.', {delayed: true});

                        return resolve(self.transitionTo('signin'));
                    }

                    resolve(model);
                }).catch(function () {
                    resolve(model);
                });
            });
        },

        deactivate: function () {
            this._super();

            // clear the properties that hold the sensitive data from the controller
            this.controllerFor('signup').setProperties({email: '', password: '', token: ''});
        }
    });

    __exports__["default"] = SignupRoute;
  });