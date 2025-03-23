import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['label', 'url'],

    label(model) {
        let label = model.label;
        let hasValidated = model.hasValidated;

        if (isBlank(label)) {
            model.errors.add('label', 'You must specify a label');
            this.invalidate();
        }

        hasValidated.addObject('label');
    },

    url(model) {
        let url = model.url;
        let hasValidated = model.hasValidated;
        /* eslint-disable camelcase */
        let validatorOptions = {require_protocol: true};
        /* eslint-enable camelcase */
        let urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9-]+:)/);

        if (isBlank(url)) {
            model.errors.add('url', 'You must specify a URL or relative path');
            this.invalidate();
        } else if (url.match(/\s/) || (!validator.isURL(url, validatorOptions) && !url.match(urlRegex))) {
            model.errors.add('url', 'You must specify a valid URL or relative path');
            this.invalidate();
        }

        hasValidated.addObject('url');
    }
});
