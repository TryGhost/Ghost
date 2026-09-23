import KoenigCardWrapper from '../components/KoenigCardWrapper';
import PodcastIcon from '../assets/icons/kg-card-type-podcast.svg?react';
import {PodcastNode as BasePodcastNode} from '@tryghost/kg-default-nodes';
import {PodcastNodeComponent} from './PodcastNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_PODCAST_COMMAND = createCommand();

// Card for the Podcasts app: picks an episode from the podcasts managed in
// Admin. It only appears in the card menu once the app has been activated
// (`cardConfig.feature.podcasts`).
export class PodcastNode extends BasePodcastNode {
    static kgMenu = [{
        label: 'Podcast',
        desc: 'Add an episode from one of your podcasts',
        Icon: PodcastIcon,
        insertCommand: INSERT_PODCAST_COMMAND,
        matches: ['podcast', 'episode', 'audio show'],
        priority: 5,
        shortcut: '/podcast',
        isHidden: ({config}) => {
            return !(config?.feature?.podcasts === true);
        }
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);
    }

    getIcon() {
        return PodcastIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} wrapperStyle="regular">
                <PodcastNodeComponent
                    artworkUrl={this.artworkUrl}
                    description={this.description}
                    duration={this.duration}
                    episodeId={this.episodeId}
                    episodeUrl={this.episodeUrl}
                    nodeKey={this.getKey()}
                    podcastTitle={this.podcastTitle}
                    title={this.title}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createPodcastNode(dataset) {
    return new PodcastNode(dataset);
}

export function $isPodcastNode(node) {
    return node instanceof PodcastNode;
}
