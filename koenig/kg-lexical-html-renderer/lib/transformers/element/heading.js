const {$isHeadingNode} = require('@lexical/rich-text');

module.exports = {
    export(node, options, exportChildren) {
        if (!$isHeadingNode(node)) {
            return null;
        }

        const tag = node.getTag();

        return `<${tag}>${exportChildren(node)}</${tag}>`;
    }
};
