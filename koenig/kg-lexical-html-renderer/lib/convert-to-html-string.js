const {
    $getRoot,
    $isElementNode,
    $isLineBreakNode,
    $isTextNode
} = require('lexical');
const {
    elementTransformers
    // textTransformers
} = require('./transformers');

function $convertToHtmlString(options = {}) {
    const output = [];
    const children = $getRoot().getChildren();

    for (const child of children) {
        const result = exportTopLevelElementOrDecorator(child, options);

        if (result !== null) {
            output.push(result);
        }
    }

    return output.join('\n');
}

function exportTopLevelElementOrDecorator(node, options) {
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

    for (const child of children) {
        if ($isLineBreakNode(child)) {
            output.push('<br>');
        } else if ($isTextNode(child)) {
            output.push(exportTextNode(child, child.getTextContent(), node, options));
        } else if ($isElementNode(child)) {
            output.push(exportChildren(child, options));
        }
    }

    return output.join('');
}

function exportTextNode(node, textContent/*, parentNode, options*/) {
    let output = textContent;

    // TODO: render formats

    return output;
}

module.exports = {
    $convertToHtmlString
};
