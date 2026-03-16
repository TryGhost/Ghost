import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

export function fromBr(): ParserPlugin {
    // mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
    return function fromBrToSoftReturnAtom(node: Node, builder: Builder, {addMarkerable, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'BR') {
            return;
        }

        const softReturn = builder.createAtom('soft-return');
        addMarkerable(softReturn);
        nodeFinished();
    };
}
