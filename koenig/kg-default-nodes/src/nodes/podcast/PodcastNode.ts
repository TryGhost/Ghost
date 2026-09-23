import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderPodcastNode} from './podcast-renderer.js';

// Card for the Podcasts app: an episode picked from a podcast managed under
// Apps > Podcasts. The episode's details are copied onto the node so posts
// render without looking the episode up again.
const podcastProperties = {
    podcastId: {default: ''},
    episodeId: {default: ''},
    podcastTitle: {default: ''},
    title: {default: ''},
    description: {default: ''},
    episodeUrl: {default: '', urlType: 'url'},
    duration: {default: ''},
    artworkUrl: {default: '', urlType: 'url'}
} satisfies DecoratorNodePropertyMap;

export type PodcastData = DecoratorNodeData<typeof podcastProperties>;

export class PodcastNode extends generateDecoratorNode({
    nodeType: 'podcast',
    properties: podcastProperties,
    defaultRenderFn: renderPodcastNode
}) {
    constructor(data: PodcastData = {}, key?: string) {
        super(data, key);
    }

    isEmpty() {
        return !this.__episodeId && !this.__title && !this.__episodeUrl;
    }

    hasEditMode() {
        return true;
    }
}

export const $createPodcastNode = (dataset?: PodcastData) => {
    return new PodcastNode(dataset);
};

export const $isPodcastNode = (node: unknown): node is PodcastNode => {
    return node instanceof PodcastNode;
};
