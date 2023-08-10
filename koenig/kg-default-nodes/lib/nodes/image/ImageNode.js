/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseImageNode} from './image-parser';
import {renderImageNode} from './image-renderer';
export class ImageNode extends generateDecoratorNode({nodeType: 'image',
    properties: [
        {name: 'src', default: '', urlType: 'url'},
        {name: 'caption', default: '', urlType: 'html', wordCount: true},
        {name: 'title', default: ''},
        {name: 'alt', default: ''},
        {name: 'cardWidth', default: 'regular'},
        {name: 'width', default: null},
        {name: 'height', default: null},
        {name: 'href', default: '', urlType: 'url'}
    ]}
) {
    /* @override */
    exportJSON() {
        // checks if src is a data string
        const {src, width, height, title, alt, caption, cardWidth, href} = this;
        const isBlob = src.startsWith('data:');

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

    exportDOM(options = {}) {
        return renderImageNode(this, options);
    }

    hasEditMode() {
        return false;
    }
}

export const $createImageNode = (dataset) => {
    return new ImageNode(dataset);
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}
