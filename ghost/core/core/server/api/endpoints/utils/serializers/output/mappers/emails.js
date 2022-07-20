const mega = require('../../../../../../services/mega');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    // Ensure we're not outputting unwanted replacement strings when viewing email contents
    // TODO: extract this to a utility, it's duplicated in the email-preview API controller
    const replacements = mega.postEmailSerializer.parseReplacements(jsonModel);
    replacements.forEach((replacement) => {
        jsonModel[replacement.format] = jsonModel[replacement.format].replace(
            replacement.match,
            replacement.fallback || ''
        );
    });

    return jsonModel;
};
