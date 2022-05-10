/**
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const extractAPIKey = (req) => {
    let keyValue = null;

    if (req.query && req.query.key) {
        keyValue = req.query.key;
    }

    return keyValue;
};

module.exports = extractAPIKey;
