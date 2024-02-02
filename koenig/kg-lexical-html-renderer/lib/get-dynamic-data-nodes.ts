import type {EditorState, LexicalNode} from 'lexical';

import {$getRoot} from 'lexical';
// TODO: update to import when this is moved to typescript
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {$isKoenigCard} = require('@tryghost/kg-default-nodes');

export default function getDynamicDataNodes(editorState: EditorState) {
    const dynamicNodes: LexicalNode[] = [];

    editorState.read(() => {
        const root = $getRoot();
        const nodes = root.getChildren();

        nodes.forEach((node: LexicalNode) => {
            if ($isKoenigCard(node) && node.hasDynamicData?.()) {
                dynamicNodes.push(node);
            }
        });
    });

    return dynamicNodes;
}