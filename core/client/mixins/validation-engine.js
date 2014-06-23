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
                return reject(self.formatErrors('The validator specified, "' + type + '", did not exist!'));
            }

            var validationErrors = validator.validate(self);

            if (Ember.isEmpty(validationErrors)) {
                return resolve();
            }

            return reject(self.formatErrors(validationErrors));
        });
    },

    // format errors to be used in `notifications.showErrors`.
    // format is [{ message: 'concatenated error messages' }]
    formatErrors: function (errors) {
        var message = 'There was an error saving this ' + this.get('validationType');

        if (Ember.isArray(errors)) {
            // get validation error messages
            message += ': ' + errors.mapBy('message').join(' ');
        } else if (typeof errors === 'object') {
            // Get messages from server response
            message += ': ' + getRequestErrorMessage(errors);
        } else if (typeof errors === 'string') {
            message += ': ' + errors;
        } else {
            message += '.';
        }

        // set format for notifications.showErrors
        message = [{ message: message }];

        return message;
    },

    // override save to do validation first
    save: function () {
        var self = this,
            // this is a hack, but needed for async _super calls.
            // ref: https://github.com/emberjs/ember.js/pull/4301
            _super = this.__nextSuper;

        // model.destroyRecord() calls model.save() behind the scenes.
        // in that case, we don't need validation checks or error propagation.
        if (this.get('isDeleted')) {
            return this._super();
        }

        // If validation fails, reject with validation errors.
        // If save to the server fails, reject with server response.
        return this.validate().then(function () {
            return _super.call(self);
        }).catch(function (result) {
            // server save failed, format the errors and reject the promise.
            // if validations failed, the errors will already be formatted for us.
            if (! Ember.isArray(result)) {
                result = self.formatErrors(result);
            }

            return Ember.RSVP.reject(result);
        });
    }
});

export default ValidationEngine;
