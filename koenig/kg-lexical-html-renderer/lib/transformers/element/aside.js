const {$isAsideNode} = require('@tryghost/kg-default-nodes');

module.exports = {
    export(node, options, exportChildren) {
        if (!$isAsideNode(node)) {
            return null;
        }

        return `<blockquote class="kg-blockquote-alt">${exportChildren(node)}</blockquote>`;
    }
};
