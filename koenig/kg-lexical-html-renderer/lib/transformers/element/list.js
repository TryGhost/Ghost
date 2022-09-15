const {$isListNode, $isListItemNode} = require('@lexical/list');

const exportList = function (node, options, exportChildren) {
    if (!$isListNode(node)) {
        return null;
    }

    const tag = node.getTag();

    const exportListContent = (listNode) => {
        const output = [];
        const children = listNode.getChildren();

        for (const child of children) {
            if (!$isListItemNode(child)) {
                continue;
            }

            const listChildren = child.getChildren();

            if ($isListNode(listChildren[0])) {
                output.push(`<li>${exportList(listChildren[0], options, exportChildren)}</li>`);
            } else {
                output.push(`<li>${exportChildren(child, options)}</li>`);
            }
        }

        return output.join('');
    };

    const listContent = exportListContent(node);

    return `<${tag}>${listContent}</${tag}>`;
};

module.exports = {
    export(node, options, exportChildren) {
        return exportList(node, options, exportChildren);
    }
};
