const {
    $getRoot,
    $isElementNode,
    $isLineBreakNode,
    $isTextNode
} = require('lexical');
const {$isLinkNode} = require('@lexical/link');
const {$isKoenigCard} = require('@tryghost/kg-default-nodes');
const TextContent = require('./utils/text-content');
const {elementTransformers} = require('./transformers');

function $convertToHtmlString(options = {}) {
    const output = [];
    const children = $getRoot().getChildren();

    options.usedIdAttributes = options.usedIdAttributes || {};

    for (const child of children) {
        const result = exportTopLevelElementOrDecorator(child, options);

        if (result !== null) {
            output.push(result);
        }
    }

    return output.join('\n');
}

function exportTopLevelElementOrDecorator(node, options) {
    if ($isKoenigCard(node)) {
        const {element, type} = node.exportDOM(options);
        return type === 'inner' ? element.innerHTML : element.outerHTML;
    }

    for (const transformer of elementTransformers) {
        if (transformer.export !== null) {
            const result = transformer.export(node, options, _node => exportChildren(_node, options));

            if (result !== null) {
                return result;
            }
        }
    }

    return $isElementNode(node) ? exportChildren(node, options) : null;
}

function exportChildren(node, options) {
    const output = [];
    const children = node.getChildren();

    const textContent = new TextContent();

    for (const child of children) {
        if (!textContent.isEmpty() && !$isLineBreakNode(child) && !$isTextNode(child) && !$isLinkNode(child)) {
            output.push(textContent.render());
            textContent.clear();
        }

        if ($isLineBreakNode(child)) {
            textContent.addLineBreak();
        } else if ($isTextNode(child)) {
            textContent.addTextNode(child, node, options);
        } else if ($isLinkNode(child)) {
            textContent.addLinkNode(child, node, exportChildren, options);
        } else if ($isElementNode(child)) {
            output.push(exportChildren(child, options));
        }
    }

    if (!textContent.isEmpty()) {
        output.push(textContent.render());
    }

    return output.join('');
}

module.exports = {
    $convertToHtmlString
};
