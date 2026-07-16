import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseGalleryNode} from './gallery-parser.js';
import {renderGalleryNode} from './gallery-renderer.js';

export interface GalleryImage {
    fileName: string;
    src: string;
    width: number;
    height: number;
    row: number;
    alt?: string;
    caption?: string;
    title?: string;
    href?: string;
}

const galleryProperties = {
    images: {default: [] as GalleryImage[]},
    caption: {default: '', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type GalleryData = DecoratorNodeData<typeof galleryProperties>;
export type GalleryNodeData = Required<GalleryData>;

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
