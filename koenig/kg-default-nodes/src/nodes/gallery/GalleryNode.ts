import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseGalleryNode} from './gallery-parser.js';
import {renderGalleryNode} from './gallery-renderer.js';

const galleryProperties = [
    {name: 'images', default: [] as unknown[]},
    {name: 'caption', default: '', wordCount: true}
] as const satisfies readonly DecoratorNodeProperty[];

export type GalleryData = DecoratorNodeData<typeof galleryProperties>;

export interface GalleryNode extends DecoratorNodeValueMap<typeof galleryProperties> {}

export class GalleryNode extends generateDecoratorNode({
    nodeType: 'gallery',
    properties: galleryProperties,
    defaultRenderFn: renderGalleryNode
}) {
    /* override */
    static get urlTransformMap() {
        return {
            caption: 'html',
            images: {
                src: 'url',
                caption: 'html'
            }
        };
    }

    static importDOM() {
        return parseGalleryNode(this);
    }

    hasEditMode() {
        return false;
    }
}

export const $createGalleryNode = (dataset?: GalleryData) => {
    return new GalleryNode(dataset);
};

export function $isGalleryNode(node: unknown): node is GalleryNode {
    return node instanceof GalleryNode;
}
