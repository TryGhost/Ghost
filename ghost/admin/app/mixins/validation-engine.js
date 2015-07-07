import Ember from 'ember';
import DS from 'ember-data';
import getRequestErrorMessage from 'ghost/utils/ajax';

import ValidatorExtensions from 'ghost/utils/validator-extensions';
import PostValidator from 'ghost/validators/post';
import SetupValidator from 'ghost/validators/setup';
import SignupValidator from 'ghost/validators/signup';
import SigninValidator from 'ghost/validators/signin';
import SettingValidator from 'ghost/validators/setting';
import ResetValidator from 'ghost/validators/reset';
import UserValidator from 'ghost/validators/user';
import TagSettingsValidator from 'ghost/validators/tag-settings';

// our extensions to the validator library
ValidatorExtensions.init();

/**
* The class that gets this mixin will receive these properties and functions.
* It will be able to validate any properties on itself (or the model it passes to validate())
* with the use of a declared validator.
*/
export default Ember.Mixin.create({
    // these validators can be passed a model to validate when the class that
    // mixes in the ValidationEngine declares a validationType equal to a key on this object.
    // the model is either passed in via `this.validate({ model: object })`
    // or by calling `this.validate()` without the model property.
    // in that case the model will be the class that the ValidationEngine
    // was mixed into, i.e. the controller or Ember Data model.
    validators: {
        post: PostValidator,
        setup: SetupValidator,
        signup: SignupValidator,
        signin: SigninValidator,
        setting: SettingValidator,
        reset: ResetValidator,
        user: UserValidator,
        tag: TagSettingsValidator
    },

    // This adds the Errors object to the validation engine, and shouldn't affect
    // ember-data models because they essentially use the same thing
    errors: DS.Errors.create(),

    /**
    * Passes the model to the validator specified by validationType.
    * Returns a promise that will resolve if validation succeeds, and reject if not.
    * Some options can be specified:
    *
    * `model: Object` - you can specify the model to be validated, rather than pass the default value of `this`,
    *                   the class that mixes in this mixin.
    *
    * `property: String` - you can specify a specific property to validate. If
    * 					   no property is specified, the entire model will be
    * 					   validated
    */
    validate: function (opts) {
        // jscs:disable safeContextKeyword
        opts = opts || {};

        var model = this,
            type,
            validator;

        if (opts.model) {
            model = opts.model;
        } else if (this instanceof DS.Model) {
            model = this;
        } else if (this.get('model')) {
            model = this.get('model');
        }

        type = this.get('validationType') || model.get('validationType');
        validator = this.get('validators.' + type) || model.get('validators.' + type);

        opts.validationType = type;

        return new Ember.RSVP.Promise(function (resolve, reject) {
            var passed;

            if (!type || !validator) {
                return reject(['The validator specified, "' + type + '", did not exist!']);
            }

            if (opts.property) {
                model.get('errors').remove(opts.property);
            } else {
                model.get('errors').clear();
            }

            passed = validator.check(model, opts.property);

            return (passed) ? resolve() : reject();
        });
    },

    /**
    * The primary goal of this method is to override the `save` method on Ember Data models.
    * This allows us to run validation before actually trying to save the model to the server.
    * You can supply options to be passed into the `validate` method, since the ED `save` method takes no options.
    */
    save: function (options) {
        var self = this,
            // this is a hack, but needed for async _super calls.
            // ref: https://github.com/emberjs/ember.js/pull/4301
            _super = this.__nextSuper;

        options = options || {};
        options.wasSave = true;

        // model.destroyRecord() calls model.save() behind the scenes.
        // in that case, we don't need validation checks or error propagation,
        // because the model itself is being destroyed.
        if (this.get('isDeleted')) {
            return this._super();
        }

        // If validation fails, reject with validation errors.
        // If save to the server fails, reject with server response.
        return this.validate(options).then(function () {
            return _super.call(self, options);
        }).catch(function (result) {
            // server save failed or validator type doesn't exist
            if (result && !Ember.isArray(result)) {
                // return the array of errors from the server
                result = getRequestErrorMessage(result);
            }

            return Ember.RSVP.reject(result);
        });
    },
    actions: {
        validate: function (property) {
            this.validate({property: property});
        }
    }
});
