import Ember from 'ember';
import DS from 'ember-data';
import {request as ajax} from 'ic-ajax';
import Configuration from 'simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

export default Ember.Route.extend(styleBody, {
    classNames: ['ghost-signup'],

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.get('notifications').showAlert('You need to sign out to register as a new user.', {type: 'warn', delayed: true});
            this.transitionTo(Configuration.routeAfterAuthentication);
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
                self.get('notifications').showAlert('Invalid token.', {type: 'error', delayed: true});

                return resolve(self.transitionTo('signin'));
            }

            tokenText = atob(params.token);
            email = tokenText.split('|')[1];

            model.set('email', email);
            model.set('token', params.token);
            model.set('errors', DS.Errors.create());

            return ajax({
                url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                type: 'GET',
                dataType: 'json',
                data: {
                    email: email
                }
            }).then(function (response) {
                if (response && response.invitation && response.invitation[0].valid === false) {
                    self.get('notifications').showAlert('The invitation does not exist or is no longer valid.', {type: 'warn', delayed: true});

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
