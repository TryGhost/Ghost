module.exports = function defFunc(ajv) {
    ajv.addKeyword({
        keyword: 'isLowercase',
        errors: false,
        validate: function (schema, data) {
            if (data) {
                return data === data.toLowerCase();
            }

            return true;
        }
    });
    return ajv;
};
