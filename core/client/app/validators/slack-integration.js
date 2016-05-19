import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['url'],

    url(model) {
        let url = model.get('url');
        let hasValidated = model.get('hasValidated');

        let urlRegex = new RegExp(/(^https:\/\/hooks\.slack\.com\/services\/)(\S+)/);

        if (!validator.empty(url) && !url.match(urlRegex)) {
            model.get('errors').add(
                'url',
                'The URL must be in a format like ' +
                    'https://hooks.slack.com/services/<your personal key>'
            );

            this.invalidate();
        }

        hasValidated.addObject('url');
    }
});
