const jsonSchema = require('@tryghost/admin-api-schema');

/**
 *
 * @param {Object} apiConfig "frame" api configuration object
 * @param {string} apiConfig.docName the name of the resource
 * @param {string} apiConfig.method API's method name
 * @param {import('@tryghost/api-framework').Frame} frame "frame" object with data attached to it
 */
const validate = async (apiConfig, frame) => await jsonSchema.validate({
    data: frame.data,
    schema: `${apiConfig.docName}-${apiConfig.method}`
});

module.exports.validate = validate;
