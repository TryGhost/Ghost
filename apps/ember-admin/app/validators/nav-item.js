import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['label', 'url'],

    label(model) {
        const label = model.label;
        const icon = model.icon;
        const hasValidated = model.hasValidated;

        if (isBlank(label) && isBlank(icon)) {
            model.errors.add('label', 'You must specify a label or icon');
            this.invalidate();
        }

        hasValidated.addObject('label');
    },

    url(model) {
        const url = model.url;
        const hasValidated = model.hasValidated;
        const validatorOptions = {require_protocol: true};
        const urlRegex = new RegExp(/^(\/|#|[a-zA-Z0-9-]+:)/);

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
