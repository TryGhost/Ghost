const {$isQuoteNode} = require('@lexical/rich-text');

module.exports = {
    export(node, options, exportChildren) {
        if (!$isQuoteNode(node)) {
            return null;
        }

        return `<blockquote>${exportChildren(node)}</blockquote>`;
    }
};
