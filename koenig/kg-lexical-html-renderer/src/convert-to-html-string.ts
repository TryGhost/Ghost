import {ElementNode, LexicalNode} from 'lexical';
import {$getRoot, $isElementNode, $isLineBreakNode, $isParagraphNode, $isTextNode} from 'lexical';
import {$isLinkNode} from '@lexical/link';
import {$isKoenigCard, RendererOptions} from '@tryghost/kg-default-nodes';
import TextContent from './utils/TextContent';
import elementTransformers from './transformers';

export default function $convertToHtmlString(options: RendererOptions = {}): string {
    const output: string[] = [];
    const children: LexicalNode[] = $getRoot().getChildren();

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

function exportTopLevelElementOrDecorator(node: LexicalNode, options: RendererOptions): string | null {
    if ($isKoenigCard(node)) {
        // NOTE: kg-default-nodes appends type in rare cases to make use of this functionality... with moving to typescript,
        //  we should change this implementation because it's confusing, or we should override the DOMExportOutput type
        const {element, type} = node.exportDOM(options);

        switch (type) {
        case 'inner':
            return element.innerHTML;
        case 'value':
            if ('value' in element) {
                return element.value;
            }

            return '';
        default:
            return element.outerHTML;
        }
    }

    if ($isElementNode(node)) {
        // note: unsure why this type isn't being picked up from the import
        for (const transformer of elementTransformers) {
            if (transformer.export !== null) {
                const result = transformer.export(node, options, _node => exportChildren(_node, options));

                if (result !== null) {
                    return result;
                }
            }
        }
    }

    return $isElementNode(node) ? exportChildren(node, options) : null;
}

function exportChildren(node: ElementNode, options: RendererOptions): string {
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
