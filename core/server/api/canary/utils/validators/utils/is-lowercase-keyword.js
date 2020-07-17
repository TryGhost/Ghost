module.exports = function defFunc(ajv) {
    defFunc.definition = {
        errors: false,
        validate: function (schema, data) {
            if (data) {
                return data === data.toLowerCase();
            }

            return true;
        }
    };

    ajv.addKeyword('isLowercase', defFunc.definition);
    return ajv;
};
