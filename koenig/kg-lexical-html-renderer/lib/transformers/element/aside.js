const {$isAsideNode} = require('../../nodes/AsideNode');

module.exports = {
    export(node, options, exportChildren) {
        if (!$isAsideNode(node)) {
            return null;
        }

        return `<aside>${exportChildren(node)}</aside>`;
    }
};
