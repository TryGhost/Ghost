/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseAudioNode} from './audio-parser';
import {renderAudioNode} from './audio-renderer';

export class AudioNode extends generateDecoratorNode({nodeType: 'audio',
    properties: [
        {name: 'duration', default: 0},
        {name: 'mimeType', default: ''},
        {name: 'src', default: '', urlType: 'url'},
        {name: 'title', default: ''},
        {name: 'thumbnailSrc', default: ''}
    ]}
) {
    static importDOM() {
        return parseAudioNode(this);
    }

    exportDOM(options = {}) {
        return renderAudioNode(this, options);
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
