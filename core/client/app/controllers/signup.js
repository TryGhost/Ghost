import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    actions: {
        signup: function () {
            var self = this,
                model = this.get('model'),
                data = model.getProperties('name', 'email', 'password', 'token'),
                notifications = this.get('notifications');

            notifications.closePassive();

            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        invitation: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            token: data.token
                        }]
                    }
                }).then(function () {
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('model.email'),
                        password: self.get('model.password')
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    notifications.showAPIError(resp);
                });
            }).catch(function (errors) {
                self.toggleProperty('submitting');
                notifications.showErrors(errors);
            });
        }
    }
});
