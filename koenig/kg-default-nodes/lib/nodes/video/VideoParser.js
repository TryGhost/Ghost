import {readCaptionFromElement} from '../../utils/read-caption-from-element';

export class VideoParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            figure: () => ({
                conversion(domNode) {
                    const isKgVideoCard = domNode.classList?.contains('kg-video-card');
                    if (domNode.tagName === 'FIGURE' && isKgVideoCard) {
                        const videoNode = domNode.querySelector('.kg-video-container video');
                        const durationNode = domNode.querySelector('.kg-video-duration');
                        const videoSrc = videoNode && videoNode.src;
                        const videoWidth = videoNode && videoNode.width;
                        const videoHeight = videoNode && videoNode.height;
                        const durationText = durationNode && durationNode.innerHTML.trim();
                        const captionText = readCaptionFromElement(domNode);

                        if (!videoSrc) {
                            return null;
                        }

                        const payload = {
                            src: videoSrc,
                            loop: !!videoNode.loop,
                            cardWidth: getCardWidth(videoNode)
                        };

                        if (durationText) {
                            const [minutes, seconds] = durationText.split(':');
                            try {
                                payload.duration = parseInt(minutes) * 60 + parseInt(seconds);
                            } catch (e) {
                                // ignore duration
                            }
                        }

                        if (domNode.dataset.kgThumbnail) {
                            payload.thumbnailSrc = domNode.dataset.kgThumbnail;
                        }

                        if (domNode.dataset.kgCustomThumbnail) {
                            payload.customThumbnailSrc = domNode.dataset.kgCustomThumbnail;
                        }

                        if (captionText) {
                            payload.caption = captionText;
                        }

                        if (videoWidth) {
                            payload.width = videoWidth;
                        }

                        if (videoHeight) {
                            payload.height = videoHeight;
                        }

                        const node = new self.NodeClass(payload);
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
        };
    }
}

function getCardWidth(domNode) {
    if (domNode.classList.contains('kg-width-full')) {
        return 'full';
    } else if (domNode.classList.contains('kg-width-wide')) {
        return 'wide';
    } else {
        return 'regular';
    }
}
