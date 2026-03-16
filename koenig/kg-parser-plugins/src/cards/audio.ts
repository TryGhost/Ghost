import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

export function fromKoenigCard(): ParserPlugin {
    return function kgAudioCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-audio-card')) {
            return;
        }

        const el = node as Element;
        const titleNode = el.querySelector('.kg-audio-title');
        const audioNode = el.querySelector('.kg-audio-player-container audio') as HTMLAudioElement | null;
        const thumbnailNode = el.querySelector('.kg-audio-thumbnail') as HTMLImageElement | null;
        const durationNode = el.querySelector('.kg-audio-duration');
        const title = titleNode && titleNode.innerHTML.trim();
        const audioSrc = audioNode && audioNode.src;
        const thumbnailSrc = thumbnailNode && thumbnailNode.src;
        const durationText = durationNode && durationNode.innerHTML.trim();

        if (!audioSrc) {
            return;
        }

        const payload: Record<string, unknown> = {
            src: audioSrc,
            title: title
        };
        if (thumbnailSrc) {
            payload.thumbnailSrc = thumbnailSrc;
        }

        if (durationText) {
            const [minutes, seconds] = durationText.split(':');
            try {
                payload.duration = parseInt(minutes) * 60 + parseInt(seconds);
            } catch {
                // ignore duration
            }
        }

        const cardSection = builder.createCardSection('audio', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
