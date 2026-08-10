import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseVideoNode} from './video-parser.js';
import {renderVideoNode} from './video-renderer.js';
import type {CardWidth} from '../../utils/card-widths.js';

const videoProperties = {
    src: {default: '', urlType: 'url'},
    caption: {default: '', urlType: 'html', wordCount: true},
    fileName: {default: ''},
    mimeType: {default: ''},
    width: {default: null as number | null},
    height: {default: null as number | null},
    duration: {default: 0},
    thumbnailSrc: {default: '', urlType: 'url'},
    customThumbnailSrc: {default: '', urlType: 'url'},
    thumbnailWidth: {default: null as number | null},
    thumbnailHeight: {default: null as number | null},
    cardWidth: {default: 'regular' as CardWidth},
    loop: {default: false}
} satisfies DecoratorNodePropertyMap;

export type VideoData = DecoratorNodeData<typeof videoProperties>;

export class VideoNode extends generateDecoratorNode({
    nodeType: 'video',
    properties: videoProperties,
    defaultRenderFn: renderVideoNode
}) {
    /* override */
    exportJSON() {
        const {src, caption, fileName, mimeType, width, height, duration, thumbnailSrc, customThumbnailSrc, thumbnailWidth, thumbnailHeight, cardWidth, loop} = this;
        // checks if src is a data string
        const isBlob = src && src.startsWith('data:');

        const dataset = {
            type: 'video',
            version: 1,
            src: isBlob ? '<base64String>' : src,
            caption,
            fileName,
            mimeType,
            width,
            height,
            duration,
            thumbnailSrc,
            customThumbnailSrc,
            thumbnailWidth,
            thumbnailHeight,
            cardWidth,
            loop
        };
        return dataset;
    }

    static importDOM() {
        return parseVideoNode(this);
    }

    get formattedDuration() {
        const minutes = Math.floor(this.duration / 60);
        const seconds = Math.floor(this.duration - (minutes * 60));
        const paddedSeconds = String(seconds).padStart(2, '0');
        const formattedDuration = `${minutes}:${paddedSeconds}`;
        return formattedDuration;
    }
}

export const $createVideoNode = (dataset?: VideoData) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node: unknown): node is VideoNode {
    return node instanceof VideoNode;
}
