import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseAudioNode} from './audio-parser.js';
import {renderAudioNode} from './audio-renderer.js';

const audioProperties = {
    duration: {default: 0},
    mimeType: {default: ''},
    src: {default: '', urlType: 'url'},
    title: {default: ''},
    thumbnailSrc: {default: ''}
} satisfies DecoratorNodePropertyMap;

export type AudioData = DecoratorNodeData<typeof audioProperties>;

export class AudioNode extends generateDecoratorNode({
    nodeType: 'audio',
    properties: audioProperties,
    defaultRenderFn: renderAudioNode
}) {
    static importDOM() {
        return parseAudioNode(this);
    }
}

export const $createAudioNode = (dataset: AudioData = {}) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node: unknown): node is AudioNode {
    return node instanceof AudioNode;
}
