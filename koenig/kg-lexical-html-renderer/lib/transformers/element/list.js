const {$isListNode, $isListItemNode} = require('@lexical/list');

const exportList = function (node, options, exportChildren) {
    if (!$isListNode(node)) {
        return null;
    }

    const tag = node.getTag();
    const start = node.getStart();

    // track an open <li> outside of the child loop, we do this so we can nest lists
    // inside <li> elements that already have their contents rendered, e.g.:
    // <li>one
    //   <ol>
    //     <li>one.two</li>
    //   </ol>
    // </li>
    let liOpen = false;

    const exportListContent = (listNode) => {
        const output = [];
        const children = listNode.getChildren();

        for (const child of children) {
            if (!$isListItemNode(child)) {
                continue;
            }

            const listChildren = child.getChildren();

            if ($isListNode(listChildren[0])) {
                output.push(exportList(listChildren[0], options, exportChildren));
                if (liOpen) {
                    output.push('</li>');
                    liOpen = false;
                }
            } else {
                if (liOpen) {
                    output.push('</li>');
                    liOpen = false;
                }
                output.push(`<li>${exportChildren(child, options)}`);
                liOpen = true;
            }
        }

        if (liOpen) {
            output.push('</li>');
            liOpen = false;
        }

        return output.join('');
    };

    const listContent = exportListContent(node);

    // CASE: list has a start value specified > 1
    if (start !== 1 && start !== null && start !== undefined) {
        return `<${tag} start="${start}">${listContent}</${tag}>`;
    } else {
        return `<${tag}>${listContent}</${tag}>`;
    }
};

module.exports = {
    export(node, options, exportChildren) {
        return exportList(node, options, exportChildren);
    }
};
