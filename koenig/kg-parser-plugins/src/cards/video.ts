import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

export function fromKoenigCard(): ParserPlugin {
    return function kgVideoCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-video-card')) {
            return;
        }

        const el = node as Element;
        const videoNode = el.querySelector('.kg-video-player-container video') as HTMLVideoElement | null;
        const durationNode = el.querySelector('.kg-video-duration');
        const videoSrc = videoNode && videoNode.src;
        const durationText = durationNode && durationNode.innerHTML.trim();

        if (!videoSrc) {
            return;
        }

        const payload: Record<string, unknown> = {
            src: videoSrc,
            loop: !!videoNode.loop
        };

        if (durationText) {
            const [minutes, seconds] = durationText.split(':');
            try {
                payload.duration = parseInt(minutes) * 60 + parseInt(seconds);
            } catch {
                // ignore duration
            }
        }

        const cardSection = builder.createCardSection('video', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
