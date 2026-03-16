export function fromKoenigCard() {
    return function kgAudioCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-audio-card')) {
            return;
        }

        const titleNode = node.querySelector('.kg-audio-title');
        const audioNode = node.querySelector('.kg-audio-player-container audio');
        const thumbnailNode = node.querySelector('.kg-audio-thumbnail');
        const durationNode = node.querySelector('.kg-audio-duration');
        const title = titleNode && titleNode.innerHTML.trim();
        const audioSrc = audioNode && audioNode.src;
        const thumbnailSrc = thumbnailNode && thumbnailNode.src;
        const durationText = durationNode && durationNode.innerHTML.trim();

        if (!audioSrc) {
            return;
        }

        const payload = {
            src: audioSrc,
            title: title
        };
        if (thumbnailSrc) {
            payload.thumbnailSrc = thumbnailSrc;
        }

        if (durationText) {
            const {minutes, seconds} = durationText.split(':');
            try {
                payload.duration = parseInt(minutes) * 60 + parseInt(seconds);
            } catch (e) {
                // ignore duration
            }
        }

        const cardSection = builder.createCardSection('audio', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
