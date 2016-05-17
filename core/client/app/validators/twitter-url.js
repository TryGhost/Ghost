import Ember from 'ember';
import FormatValidator from 'ember-cp-validations/validators/format';

const {
    isBlank
} = Ember;

// we extend FormatValidator because it uses the url validator regex
export default FormatValidator.extend({
    validate(value, options, model, attribute) {
        if (value.match(/(^https:\/\/twitter\.com\/)(\S+)/g)) {
            return true;
        }

        if (isBlank(value)) {
            return true;
        }

        let urlRegex = this.get('regularExpressions.url');

        if (value.match(/(?:twitter\.com\/)(\S+)/) || (!urlRegex.test(value) && value.match(/([a-zA-Z0-9\.]+)/))) {
            let [ , username] = value.match(/(?:twitter\.com\/)(\S+)/) || value.match(/([a-zA-Z0-9\.]+)/);
            let newValue = `https://twitter.com/${username}`;

            model.set(attribute, newValue);

            return true;
        }

        return this._super(value, {
            type: 'url',
            message: 'The URL must be in a format like https://twitter.com/yourUsername'
        }, model, attribute);
    }
});
