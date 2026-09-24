import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseImageNode} from './image-parser.js';
import {renderImageNode} from './image-renderer.js';
import type {CardWidth} from '../../utils/card-widths.js';

const imageProperties = {
    src: {default: '', urlType: 'url'},
    caption: {default: '', urlType: 'html', wordCount: true},
    title: {default: ''},
    alt: {default: ''},
    cardWidth: {default: 'regular' as CardWidth},
    width: {default: null as number | null},
    height: {default: null as number | null},
    href: {default: '', urlType: 'url'}
} satisfies DecoratorNodePropertyMap;

export type ImageData = DecoratorNodeData<typeof imageProperties, true>;

export class ImageNode extends generateDecoratorNode({
    nodeType: 'image',
    hasVisibility: true,
    properties: imageProperties,
    defaultRenderFn: renderImageNode
}) {
    /* @override */
    exportJSON() {
        // checks if src is a data string
        const {src, width, height, title, alt, caption, cardWidth, href, visibility} = this;
        const isBlob = src && src.startsWith('data:');

        const dataset = {
            type: 'image',
            version: 1,
            src: isBlob ? '<base64String>' : src,
            width,
            height,
            title,
            alt,
            caption,
            cardWidth,
            href,
            visibility
        };
        return dataset;
    }

    static importDOM() {
        return parseImageNode(this);
    }

    hasEditMode() {
        return false;
    }
}

export const $createImageNode = (dataset?: ImageData) => {
    return new ImageNode(dataset);
};

export function $isImageNode(node: unknown): node is ImageNode {
    return node instanceof ImageNode;
}
