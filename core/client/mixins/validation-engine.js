import { getRequestErrorMessage } from 'ghost/utils/ajax';

import ValidatorExtensions from 'ghost/utils/validator-extensions';
import PostValidator from 'ghost/validators/post';

ValidatorExtensions.init();

var ValidationEngine = Ember.Mixin.create({
    validators: {
        post: PostValidator
    },

    validate: function () {
        var self = this,
            type = this.get('validationType'),
            validator = this.get('validators.' + type);

        return new Ember.RSVP.Promise(function (resolve, reject) {
            if (!type || !validator) {
                return reject('The validator specified, "' + type + '", did not exist!');
            }

            var validationErrors = validator.validate(self);

            if (Ember.isEmpty(validationErrors)) {
                return resolve();
            }

            return reject(validationErrors);
        });
    },

    // override save to do validation first
    save: function () {
        var self = this,
            // this is a hack, but needed for async _super calls.
            // ref: https://github.com/emberjs/ember.js/pull/4301
            _super = this.__nextSuper;

        // If validation fails, reject with validation errors.
        // If save to the server fails, reject with server response.
        return this.validate().then(function () {
            return _super.call(self);
        }).catch(function (result) {
            var message = 'There was an error saving this ' + self.get('validationType');

            if (Ember.isArray(result)) {
                // get validation error messages
                message += ': ' + result.mapBy('message').join(' ');
            } else if (typeof result === 'object') {
                // Get messages from server response
                message += ': ' + getRequestErrorMessage(result);
            } else if (typeof result === 'string') {
                message += ': ' + result;
            } else {
                message += '.';
            }

            // set format for notifications.showErrors
            message = [{ message: message }];

            return new Ember.RSVP.Promise(function (resolve, reject) {
                reject(message);
            });
        });
    }
});

export default ValidationEngine;
