/**
 * @typedef {object} ApiKey
 * @prop {string} key
 * @prop {string} type
 */

/**
 *
 * @param {import('express').Request} req
 * @returns {ApiKey}
 */
const extractAPIKey = (req) => {
    let key = null;
    let type = null;

    if (req.query && req.query.key) {
        type = 'content';
        key = req.query.key;
    }

    return {key, type};
};

module.exports = extractAPIKey;
