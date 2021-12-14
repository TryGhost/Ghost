export function fromKoenigCard() {
    return function kgVideoCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-video-card')) {
            return;
        }

        const videoNode = node.querySelector('.kg-video-player-container video');
        const durationNode = node.querySelector('.kg-video-duration');
        const videoSrc = videoNode && videoNode.src;
        const durationText = durationNode && durationNode.innerHTML.trim();

        if (!videoSrc) {
            return;
        }

        const payload = {
            src: videoSrc,
            loop: !!videoNode.loop
        };

        if (durationText) {
            const {minutes, seconds} = durationText.split(':');
            try {
                payload.duration = parseInt(minutes) * 60 + parseInt(seconds);
            } catch (e) {
                // ignore duration
            }
        }

        const cardSection = builder.createCardSection('video', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
