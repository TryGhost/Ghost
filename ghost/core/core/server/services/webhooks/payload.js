module.exports = ({serialize}) => (event, model) => {
    const payload = {};

    if (model) {
        return serialize(event, model)
            .then((result) => {
                Object.assign(payload, result);

                return payload;
            });
    }

    return Promise.resolve(payload);
};
