const {PERMIT_ACCESS, BLOCK_ACCESS} = require('./constants');
const accessChecks = require('./access-checks');
const gatedBlocks = require('./gated-blocks');

/**
 * @typedef {import ('./typings').GatedPost} GatedPost
 * @typedef {import ('./typings').GatedMember} GatedMember
 */

module.exports = {
    PERMIT_ACCESS,
    BLOCK_ACCESS,
    checkPostAccess: accessChecks.checkPostAccess,
    checkGatedBlockAccess: accessChecks.checkGatedBlockAccess,
    htmlHasGatedBlocks: gatedBlocks.htmlHasGatedBlocks,
    // avoid circular require dependency by using "DI" for checkGatedBlockAccess
    removeGatedBlocksFromHtml: (html, member) => {
        return gatedBlocks.removeGatedBlocksFromHtml(html, member, accessChecks.checkGatedBlockAccess);
    }
};
