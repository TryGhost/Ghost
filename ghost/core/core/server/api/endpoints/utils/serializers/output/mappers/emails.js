const labs = require('../../../../../../../shared/labs');
const config = require('../../../../../../../shared/config');
const emailService = require('../../../../../../services/email-service');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    // Ensure we're not outputting unwanted replacement strings when viewing email contents
    // TODO: extract this to a utility, it's duplicated in the email-preview API controller
    if (jsonModel.html) {
        const replacements = emailService.renderer.buildReplacementDefinitions({html: jsonModel.html, newsletter: {
            get: () => ''
        }});
        const exampleMember = emailService.service.getDefaultExampleMember();

        // Do manual replacements with an example member
        for (const replacement of replacements) {
            jsonModel.html = jsonModel.html.replace(replacement.token, replacement.getValue(exampleMember));

            if (jsonModel.plaintext) {
                jsonModel.plaintext = jsonModel.plaintext.replace(replacement.token, replacement.getValue(exampleMember));
            }
        }
    }

    if (!labs.isSet('emailErrors') && !!(config.get('bulkEmail') && config.get('bulkEmail').mailgun)) {
        if (jsonModel.status === 'failed') {
            jsonModel.status = 'submitted';
        }
    }

    return jsonModel;
};
