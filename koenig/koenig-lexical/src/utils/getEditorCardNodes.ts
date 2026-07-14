import {getKoenigCardNodeClass, hasKoenigCardMenu} from './koenig-node-class';
import {getRegisteredNodeClasses} from './lexical-internals';
import type {KoenigCardMenuNodeClass} from './koenig-node-class';
import type {LexicalEditor} from 'lexical';

export function getEditorCardNodes(editor: LexicalEditor): Array<[string, KoenigCardMenuNodeClass]> {
    // TODO: open upstream PR to add public method of getting nodes
    const allNodes = getRegisteredNodeClasses(editor);
    const cardNodes: Array<[string, KoenigCardMenuNodeClass]> = [];

    for (const [nodeType, {klass}] of allNodes) {
        const nodeClass = getKoenigCardNodeClass(klass);
        if (!hasKoenigCardMenu(nodeClass)) {
            continue;
        }

        cardNodes.push([nodeType, nodeClass]);
    }

    return cardNodes;
}
