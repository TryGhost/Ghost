const emailService = require('../../../../../../services/email-service');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    // Ensure we're not outputting unwanted replacement strings when viewing email contents
    // TODO: extract this to a utility, it's duplicated in the email-preview API controller
    if (jsonModel.html && emailService.renderer && emailService.service) {
        // In worker threads the renderer and servie service are not available, but we don't need to do this, so okay to skip.
        const replacements = emailService.renderer.buildReplacementDefinitions({html: jsonModel.html, newsletterUuid: 'preview'});
        const exampleMember = emailService.service.getDefaultExampleMember();

        jsonModel.html = emailService.service.replaceDefinitions(jsonModel.html, replacements, exampleMember);

        if (jsonModel.plaintext) {
            jsonModel.plaintext = emailService.service.replaceDefinitions(jsonModel.plaintext, replacements, exampleMember);
        }
    }

    // Removed loaded post relation if set
    delete jsonModel.post;

    return jsonModel;
};
