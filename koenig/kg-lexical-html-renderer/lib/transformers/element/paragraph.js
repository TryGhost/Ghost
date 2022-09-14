const {$isParagraphNode} = require('lexical');

module.exports = {
    export(node, options, exportChildren) {
        if (!$isParagraphNode(node)) {
            return null;
        }

        return `<p>${exportChildren(node)}</p>`;
    }
};
