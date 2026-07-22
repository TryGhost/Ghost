import EmberObject from '@ember/object';
import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import classic from 'ember-classic-decorator';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// EmberObject is still needed here for ValidationEngine
@classic
class SignupDetails extends EmberObject.extend(ValidationEngine) {
    @tracked name = '';
    @tracked email = '';
    @tracked password = '';

    token = '';
    blogTitle = ''; // used for password validation

    validationType = 'signup';
}

export default class SignupRoute extends UnauthenticatedRoute {
    @service ghostPaths;
    @service notifications;
    @service session;
    @service ajax;

    @inject config;

    beforeModel() {
        if (this.session.isAuthenticated) {
            this.notifications.showAlert('You need to sign out to register as a new user.', {type: 'warn', delayed: true, key: 'signup.create.already-authenticated'});
        }

        super.beforeModel(...arguments);
    }

    model(params) {
        let signupDetails = SignupDetails.create();
        let re = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}|[A-Za-z0-9_-]{3})?$/;
        let email,
            tokenText;

        return new Promise((resolve) => {
            if (!re.test(params.token)) {
                this.notifications.showAlert('Invalid token.', {type: 'error', delayed: true, key: 'signup.create.invalid-token'});

                resolve(this.transitionTo('signin'));
                return;
            }

            tokenText = atob(params.token);
            email = tokenText.split('|')[1];

            // leave e-mail blank even though we get it from the token because
            // we need the user to type it in for Chrome to remember the
            // email/password combo properly
            signupDetails.email = '';
            signupDetails.token = params.token;

            let authUrl = this.ghostPaths.url.api('authentication', 'invitation');

            this.ajax.request(authUrl, {
                dataType: 'json',
                data: {
                    email
                }
            }).then((response) => {
                if (response && response.invitation && response.invitation[0].valid === false) {
                    this.notifications.showAlert('The invitation does not exist or is no longer valid.', {type: 'warn', delayed: true, key: 'signup.create.invalid-invitation'});

                    resolve(this.transitionTo('signin'));
                    return;
                }

                // set blogTitle, so password validation has access to it
                signupDetails.blogTitle = this.config.blogTitle;

                resolve(signupDetails);
            }).catch(() => {
                resolve(signupDetails);
            });
        });
    }

    deactivate() {
        super.deactivate(...arguments);

        // clear the properties that hold the sensitive data from the controller
        const signupDetails = this.controllerFor('signup').signupDetails;
        signupDetails.email = '';
        signupDetails.password = '';
        signupDetails.token = '';
    }
}
