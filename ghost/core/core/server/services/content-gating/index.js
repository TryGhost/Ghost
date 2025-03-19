const {PERMIT_ACCESS, BLOCK_ACCESS} = require('./constants');
const accessChecks = require('./access-checks');
const gatedBlocks = require('./gated-blocks');
const attrGating = require('./attr-gating');

module.exports = {
    PERMIT_ACCESS,
    BLOCK_ACCESS,
    checkPostAccess: accessChecks.checkPostAccess,
    checkGatedBlockAccess: accessChecks.checkGatedBlockAccess,
    htmlHasGatedBlocks: gatedBlocks.htmlHasGatedBlocks,
    removeGatedBlocksFromHtml: gatedBlocks.removeGatedBlocksFromHtml,
    gatePostAttrs: attrGating.gatePostAttrs
};
