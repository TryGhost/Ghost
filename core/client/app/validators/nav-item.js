import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['label', 'url'],

    label(model) {
        let label = model.get('label');
        let hasValidated = model.get('hasValidated');

        if (validator.empty(label)) {
            model.get('errors').add('label', 'You must specify a label');
            this.invalidate();
        }

        hasValidated.addObject('label');
    },

    url(model) {
        let url = model.get('url');
        let hasValidated = model.get('hasValidated');
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        let validatorOptions = {require_protocol: true};
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        let urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9\-]+:)/);

        if (validator.empty(url)) {
            model.get('errors').add('url', 'You must specify a URL or relative path');
            this.invalidate();
        } else if (url.match(/\s/) || (!validator.isURL(url, validatorOptions) && !url.match(urlRegex))) {
            model.get('errors').add('url', 'You must specify a valid URL or relative path');
            this.invalidate();
        }

        hasValidated.addObject('url');
    }
});
