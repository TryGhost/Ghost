const utils = require('../../../index');
const emailAddressService = require('../../../../../../services/email-address');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);

    if (utils.isContentAPI(frame)) {
        const serialized = {
            id: jsonModel.id,
            uuid: jsonModel.uuid,
            name: jsonModel.name,
            description: jsonModel.description,
            slug: jsonModel.slug,
            sender_email: jsonModel.sender_email,
            subscribe_on_signup: jsonModel.subscribe_on_signup,
            visibility: jsonModel.visibility,
            sort_order: jsonModel.sort_order,
            created_at: jsonModel.created_at,
            updated_at: jsonModel.updated_at
        };

        return serialized;
    } else {
        if (jsonModel.sender_email && jsonModel.sender_reply_to === 'newsletter') {
            // If sender_email is not allowed, we'll return it as the sender_reply_to instead, so we display the current situation correctly in the frontend
            // If one of the properties was changed, we need to reset sender_email in case it was not changed but is invalid in the database
            // which can happen after a config change (= auto correcting behaviour)
            const validated = emailAddressService.service.validate(jsonModel.sender_email, 'from');
            if (!validated.allowed) {
                jsonModel.sender_reply_to = jsonModel.sender_email;
                jsonModel.sender_email = null;
            }
        }
    }

    return jsonModel;
};
