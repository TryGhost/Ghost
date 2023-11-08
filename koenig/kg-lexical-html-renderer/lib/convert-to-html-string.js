const {
    $getRoot,
    $isElementNode,
    $isLineBreakNode,
    $isParagraphNode,
    $isTextNode
} = require('lexical');
const {$isLinkNode} = require('@lexical/link');
const {$isKoenigCard} = require('@tryghost/kg-default-nodes');
const TextContent = require('./utils/TextContent');
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

    // Koenig keeps a blank paragraph at the end of a doc but we want to
    // make sure it doesn't get rendered
    const lastChild = children[children.length - 1];
    if (lastChild && $isParagraphNode(lastChild) && lastChild.getTextContent().trim() === '') {
        output.pop();
    }

    return output.join('');
}

function exportTopLevelElementOrDecorator(node, options) {
    if ($isKoenigCard(node)) {
        const {element, type} = node.exportDOM(options);
        switch (type) {
        case 'inner':
            return element.innerHTML;
        case 'value':
            return element.value;
        default:
            return element.outerHTML;
        }
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

    const textContent = new TextContent(exportChildren, options);

    for (const child of children) {
        if (!textContent.isEmpty() && !$isLineBreakNode(child) && !$isTextNode(child) && !$isLinkNode(child)) {
            output.push(textContent.render());
            textContent.clear();
        }

        if ($isLineBreakNode(child) || $isTextNode(child) || $isLinkNode(child)) {
            textContent.addNode(child);
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
