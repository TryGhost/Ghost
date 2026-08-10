import {$getRoot} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import type {KoenigCard} from '@tryghost/kg-default-nodes';
import type {EditorState} from 'lexical';

export default function getDynamicDataNodes(editorState: EditorState): KoenigCard[] {
    const dynamicNodes: KoenigCard[] = [];

    editorState.read(() => {
        const root = $getRoot();
        const nodes = root.getChildren();

        nodes.forEach((node) => {
            if ($isKoenigCard(node) && node.hasDynamicData()) {
                dynamicNodes.push(node);
            }
        });
    });

    return dynamicNodes;
}
