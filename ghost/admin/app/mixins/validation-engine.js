// TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
// eslint-disable-next-line
import CollectionValidator from 'ghost-admin/validators/collection';
import CustomViewValidator from 'ghost-admin/validators/custom-view';
import DS from 'ember-data'; // eslint-disable-line
import IntegrationValidator from 'ghost-admin/validators/integration';
import InviteUserValidator from 'ghost-admin/validators/invite-user';
import LabelValidator from 'ghost-admin/validators/label';
import MemberValidator from 'ghost-admin/validators/member';
import Mixin from '@ember/object/mixin';
import Model from '@ember-data/model';
import NavItemValidator from 'ghost-admin/validators/nav-item';
import NewsletterValidator from 'ghost-admin/validators/newsletter';
import OfferValidator from 'ghost-admin/validators/offer';
import PostValidator from 'ghost-admin/validators/post';
import RSVP from 'rsvp';
import ResetValidator from 'ghost-admin/validators/reset';
import SettingValidator from 'ghost-admin/validators/setting';
import SetupValidator from 'ghost-admin/validators/setup';
import SigninValidator from 'ghost-admin/validators/signin';
import SignupValidator from 'ghost-admin/validators/signup';
import SnippetValidator from 'ghost-admin/validators/snippet';
import TagSettingsValidator from 'ghost-admin/validators/tag-settings';
import TierBenefitItemValidator from 'ghost-admin/validators/tier-benefit-item';
import TierValidator from 'ghost-admin/validators/tier';
import UserValidator from 'ghost-admin/validators/user';
import WebhookValidator from 'ghost-admin/validators/webhook';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

const {Errors} = DS;

/**
* The class that gets this mixin will receive these properties and functions.
* It will be able to validate any properties on itself (or the model it passes to validate())
* with the use of a declared validator.
*/
export default Mixin.create({
    // these validators can be passed a model to validate when the class that
    // mixes in the ValidationEngine declares a validationType equal to a key on this object.
    // the model is either passed in via `this.validate({ model: object })`
    // or by calling `this.validate()` without the model property.
    // in that case the model will be the class that the ValidationEngine
    // was mixed into, i.e. the controller or Ember Data model.
    validators: null,

    // This adds the Errors object to the validation engine, and shouldn't affect
    // ember-data models because they essentially use the same thing
    errors: null,

    // Store whether a property has been validated yet, so that we know whether or not
    // to show error / success validation for a field
    hasValidated: null,

    init() {
        this._super(...arguments);
        this.set('errors', Errors.create());
        this.set('hasValidated', emberA());

        this.validators = {
            customView: CustomViewValidator,
            inviteUser: InviteUserValidator,
            navItem: NavItemValidator,
            tierBenefitItem: TierBenefitItemValidator,
            post: PostValidator,
            reset: ResetValidator,
            setting: SettingValidator,
            setup: SetupValidator,
            signin: SigninValidator,
            signup: SignupValidator,
            tag: TagSettingsValidator,
            collection: CollectionValidator,
            user: UserValidator,
            member: MemberValidator,
            integration: IntegrationValidator,
            webhook: WebhookValidator,
            label: LabelValidator,
            snippet: SnippetValidator,
            tier: TierValidator,
            offer: OfferValidator,
            newsletter: NewsletterValidator
        };
    },

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
    validate(opts) {
        let model = this;
        let hasValidated,
            type,
            validator;

        opts = opts || {};

        if (opts.model) {
            model = opts.model;
        } else if (this instanceof Model) {
            model = this;
        } else if (this.model) {
            model = this.model;
        }

        type = this.validationType || model.validationType;
        validator = this.get(`validators.${type}`) || model.validators[type];
        hasValidated = this.hasValidated;

        opts.validationType = type;

        return new RSVP.Promise((resolve, reject) => {
            let passed;

            if (!type || !validator) {
                return reject([`The validator specified, "${type}", did not exist!`]);
            }

            if (opts.property) {
                // If property isn't in `hasValidated`, add it to mark that this field can show a validation result
                hasValidated.addObject(opts.property);
                model.errors.remove(opts.property);
            } else {
                model.errors.clear();
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
    save(options) {
        let {_super} = this;

        options = options || {};
        options.wasSave = true;

        // model.destroyRecord() calls model.save() behind the scenes.
        // in that case, we don't need validation checks or error propagation,
        // because the model itself is being destroyed.
        if (this.isDeleted) {
            return this._super(...arguments);
        }

        // If validation fails, reject with validation errors.
        // If save to the server fails, reject with server response.
        return this.validate(options).then(() => {
            if (typeof this.beforeSave === 'function') {
                this.beforeSave();
            }
            return _super.call(this, options);
        }).catch((result) => {
            // server save failed or validator type doesn't exist
            if (result && !isEmberArray(result)) {
                throw result;
            }

            return RSVP.reject(result);
        });
    },

    actions: {
        validate(property) {
            this.validate({property});
        }
    }
});
