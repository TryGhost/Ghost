export function fromKoenigCard() {
    return function kgAudioCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-audio-card')) {
            return;
        }

        const titleNode = node.querySelector('.kg-audio-title');
        const audioNode = node.querySelector('.kg-player-container audio');
        const thumbnailNode = node.querySelector('.kg-audio-thumbnail');
        const title = titleNode && titleNode.innerHTML.trim();
        const audioSrc = audioNode && audioNode.src;
        const thumbnailSrc = thumbnailNode && thumbnailNode.src;

        if (!audioSrc) {
            return;
        }

        const payload = {
            src: audioSrc,
            fileName: title
        };
        if (thumbnailSrc) {
            payload.thumbnailSrc = thumbnailSrc;
        }

        const cardSection = builder.createCardSection('audio', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
