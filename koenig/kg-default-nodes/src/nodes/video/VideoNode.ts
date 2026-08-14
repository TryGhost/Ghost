import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseVideoNode} from './video-parser.js';
import {renderVideoNode} from './video-renderer.js';

const videoProperties = [
    {name: 'src', default: '', urlType: 'url'},
    {name: 'caption', default: '', urlType: 'html', wordCount: true},
    {name: 'fileName', default: ''},
    {name: 'mimeType', default: ''},
    {name: 'width', default: null as number | null},
    {name: 'height', default: null as number | null},
    {name: 'duration', default: 0},
    {name: 'thumbnailSrc', default: '', urlType: 'url'},
    {name: 'customThumbnailSrc', default: '', urlType: 'url'},
    {name: 'thumbnailWidth', default: null as number | null},
    {name: 'thumbnailHeight', default: null as number | null},
    {name: 'cardWidth', default: 'regular'},
    {name: 'loop', default: false}
] as const satisfies readonly DecoratorNodeProperty[];

export type VideoData = DecoratorNodeData<typeof videoProperties>;

export interface VideoNode extends DecoratorNodeValueMap<typeof videoProperties> {}

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
