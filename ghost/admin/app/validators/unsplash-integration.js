import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['applicationId'],

    applicationId(model) {
        let applicationId = model.get('applicationId');
        let hasValidated = model.get('hasValidated');

        let whiteSpaceRegex = new RegExp(/^\S*$/gi);

        if (!applicationId.match(whiteSpaceRegex)) {
            model.get('errors').add(
                'applicationId',
                'Please enter a valid Application Id for Unsplash'
            );

            this.invalidate();
        }

        hasValidated.addObject('applicationId');
    }
});
