const mega = require('../../../../../../services/mega');
const labs = require('../../../../../../../shared/labs');
const config = require('../../../../../../../shared/config');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    // Ensure we're not outputting unwanted replacement strings when viewing email contents
    // TODO: extract this to a utility, it's duplicated in the email-preview API controller
    const replacements = mega.postEmailSerializer.parseReplacements(jsonModel);
    replacements.forEach((replacement) => {
        jsonModel[replacement.format] = jsonModel[replacement.format].replace(
            replacement.regexp,
            replacement.fallback || ''
        );
    });

    if (!labs.isSet('emailErrors') && !!(config.get('bulkEmail') && config.get('bulkEmail').mailgun)) {
        if (jsonModel.status === 'failed') {
            jsonModel.status = 'submitted';
        }
    }

    return jsonModel;
};
