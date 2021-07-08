import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {get} from '@ember/object';
import {isArray as isEmberArray} from '@ember/array';
import {
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    flowErrors: '',
    profileImage: null,

    signupDetails: alias('model'),

    actions: {
        validate(property) {
            return this.signupDetails.validate({property});
        },

        setImage(image) {
            this.set('profileImage', image);
        },

        submit(event) {
            event.preventDefault();
            this.signup.perform();
        }
    },

    signup: task(function* () {
        let setupProperties = ['name', 'email', 'password', 'token'];
        let notifications = this.notifications;

        this.set('flowErrors', '');
        this.get('signupDetails.hasValidated').addObjects(setupProperties);

        try {
            yield this.signupDetails.validate();
            yield this._completeInvitation();

            try {
                yield this._authenticateWithPassword();
                yield this._sendImage.perform();
            } catch (error) {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }
        } catch (error) {
            // ValidationEngine throws undefined
            if (!error) {
                this.set('flowErrors', 'Please fill out the form to complete your sign-up');
                return false;
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                if (isVersionMismatchError(error)) {
                    notifications.showAPIError(error);
                }
                this.set('flowErrors', error.payload.errors[0].message);
            } else {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }
        }
    }).drop(),

    _completeInvitation() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');
        let signupDetails = this.signupDetails;

        return this.ajax.post(authUrl, {
            dataType: 'json',
            data: {
                invitation: [{
                    name: signupDetails.get('name'),
                    email: signupDetails.get('email'),
                    password: signupDetails.get('password'),
                    token: signupDetails.get('token')
                }]
            }
        });
    },

    _authenticateWithPassword() {
        let email = this.get('signupDetails.email');
        let password = this.get('signupDetails.password');

        return this.session
            .authenticate('authenticator:cookie', email, password);
    },

    _sendImage: task(function* () {
        let formData = new FormData();
        let imageFile = this.profileImage;
        let uploadUrl = this.get('ghostPaths.url').api('images', 'upload');

        if (imageFile) {
            formData.append('file', imageFile, imageFile.name);
            formData.append('purpose', 'profile_image');

            let user = this.session.user;
            let response = yield this.ajax.post(uploadUrl, {
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'text'
            });

            let [image] = get(JSON.parse(response), 'images');
            let imageUrl = image.url;

            user.set('profileImage', imageUrl);

            return yield user.save();
        }
    })
});
