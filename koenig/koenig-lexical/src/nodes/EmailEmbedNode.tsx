import {EmbedNode} from './EmbedNode';

export class EmailEmbedNode extends EmbedNode {
    // Only show embed and youtube cards in the email editor
    static kgMenu = EmbedNode.kgMenu.filter(
        item => item.matches?.includes('embed') || item.matches?.includes('youtube')
    );
}

export const emailEmbedNodeReplacement = {replace: EmbedNode, with: (node) => {
    return new EmailEmbedNode(node.exportJSON());
}};
