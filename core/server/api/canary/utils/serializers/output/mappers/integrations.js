module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    if (jsonModel.api_keys) {
        jsonModel.api_keys.forEach((key) => {
            if (key.type === 'admin') {
                key.secret = `${key.id}:${key.secret}`;
            }
        });
    }

    return jsonModel;
};
