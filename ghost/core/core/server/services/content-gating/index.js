const {PERMIT_ACCESS, BLOCK_ACCESS} = require('./constants');
const {checkPostAccess, checkGatedBlockAccess} = require('./access-checks');

/**
 * @typedef {import ('./typings').GatedPost} GatedPost
 * @typedef {import ('./typings').GatedMember} GatedMember
 */

module.exports = {
    PERMIT_ACCESS,
    BLOCK_ACCESS,
    checkPostAccess,
    checkGatedBlockAccess
};
