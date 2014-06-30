var SigninController = Ember.Controller.extend(Ember.SimpleAuth.LoginControllerMixin, {
    authenticatorFactory: 'ember-simple-auth-authenticator:oauth2-password-grant',
});

export default SigninController;
