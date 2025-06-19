/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseGalleryNode} from './gallery-parser';

export class GalleryNode extends generateDecoratorNode({
    nodeType: 'gallery',
    properties: [
        {name: 'images', default: []},
        {name: 'caption', default: '', wordCount: true}
    ]
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

export const $createGalleryNode = (dataset) => {
    return new GalleryNode(dataset);
};

export function $isGalleryNode(node) {
    return node instanceof GalleryNode;
}
