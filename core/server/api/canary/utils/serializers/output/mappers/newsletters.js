const utils = require('../../../index');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);

    if (utils.isContentAPI(frame)) {
        const serialized = {
            id: jsonModel.id,
            uuid: jsonModel.uuid,
            name: jsonModel.name,
            description: jsonModel.description,
            slug: jsonModel.slug,
            subscribe_on_signup: jsonModel.subscribe_on_signup,
            visibility: jsonModel.visibility,
            sort_order: jsonModel.sort_order,
            created_at: jsonModel.created_at,
            updated_at: jsonModel.updated_at
        };

        return serialized;
    }

    return jsonModel;
};
