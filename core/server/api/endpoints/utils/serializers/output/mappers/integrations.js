module.exports = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);

    if (jsonModel.api_keys) {
        jsonModel.api_keys.forEach((key) => {
            if (key.type === 'admin') {
                key.secret = `${key.id}:${key.secret}`;
            }
        });
    }

    return jsonModel;
};
