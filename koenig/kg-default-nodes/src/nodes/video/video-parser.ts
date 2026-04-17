import type {LexicalNode} from 'lexical';
import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';

export function parseVideoNode(VideoNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            const isKgVideoCard = nodeElem.classList?.contains('kg-video-card');
            if (nodeElem.tagName === 'FIGURE' && isKgVideoCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const videoNode = domNode.querySelector('.kg-video-container video') as HTMLVideoElement | null;
                        const durationNode = domNode.querySelector('.kg-video-duration');
                        const videoSrc = videoNode && videoNode.src;
                        const videoWidth = videoNode && videoNode.width;
                        const videoHeight = videoNode && videoNode.height;
                        const durationText = durationNode && durationNode.innerHTML.trim();
                        const captionText = readCaptionFromElement(domNode);

                        if (!videoSrc) {
                            return null;
                        }

                        const payload: Record<string, unknown> = {
                            src: videoSrc,
                            loop: !!videoNode.loop,
                            cardWidth: getCardWidth(domNode)
                        };

                        if (durationText) {
                            const [rawMinutes, rawSeconds = '0'] = durationText.split(':');
                            const minutes = Number.parseInt(rawMinutes.trim(), 10);
                            const seconds = Number.parseInt(rawSeconds.trim(), 10);

                            if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
                                payload.duration = minutes * 60 + seconds;
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

                        const node = new VideoNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}

function getCardWidth(domNode: Element) {
    if (domNode.classList.contains('kg-width-full')) {
        return 'full';
    } else if (domNode.classList.contains('kg-width-wide')) {
        return 'wide';
    } else {
        return 'regular';
    }
}
