import BaseValidator from './base';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['url'],

    url(model) {
        let url = model.get('url');
        let hasValidated = model.get('hasValidated');

        // eslint-disable-next-line camelcase
        if (!isBlank(url) && !validator.isURL(url, {require_protocol: true})) {
            model.get('errors').add(
                'url',
                'The URL must be in a format like https://hooks.slack.com/services/<your personal key>'
            );

            this.invalidate();
        }

        hasValidated.addObject('url');
    }
});
