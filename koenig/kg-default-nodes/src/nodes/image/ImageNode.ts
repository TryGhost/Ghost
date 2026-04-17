import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseImageNode} from './image-parser.js';
import {renderImageNode} from './image-renderer.js';

const imageProperties = [
    {name: 'src', default: '', urlType: 'url'},
    {name: 'caption', default: '', urlType: 'html', wordCount: true},
    {name: 'title', default: ''},
    {name: 'alt', default: ''},
    {name: 'cardWidth', default: 'regular'},
    {name: 'width', default: null as number | null},
    {name: 'height', default: null as number | null},
    {name: 'href', default: '', urlType: 'url'}
] as const satisfies readonly DecoratorNodeProperty[];

export type ImageData = DecoratorNodeData<typeof imageProperties>;

export interface ImageNode extends DecoratorNodeValueMap<typeof imageProperties> {}

export class ImageNode extends generateDecoratorNode({
    nodeType: 'image',
    properties: imageProperties,
    defaultRenderFn: renderImageNode
}) {
    /* @override */
    exportJSON() {
        // checks if src is a data string
        const {src, width, height, title, alt, caption, cardWidth, href} = this;
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
            href
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
