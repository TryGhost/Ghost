import type {LexicalNode} from 'lexical';
import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';

// TODO: add NFT card parser
export function parseEmbedNode(EmbedNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            if (nodeElem.nodeType === 1 && nodeElem.tagName === 'FIGURE') {
                const iframe = nodeElem.querySelector('iframe');
                if (iframe) {
                    return {
                        conversion(domNode: HTMLElement) {
                            const payload = _createPayloadForIframe(iframe);

                            if (!payload) {
                                return null;
                            }

                            payload.caption = readCaptionFromElement(domNode);

                            const node = new EmbedNode(payload);
                            return {node};
                        },
                        priority: 1 as const
                    };
                }
                const blockquote = nodeElem.querySelector('blockquote');
                if (blockquote) {
                    return {
                        conversion(domNode: HTMLElement) {
                            const link = domNode.querySelector('a');
                            if (!link) {
                                return null;
                            }

                            const url = link.getAttribute('href');

                            // If we don't have a url, or it's not an absolute URL, we can't handle this
                            if (!url || !url.match(/^https?:\/\//i)) {
                                return null;
                            }

                            const payload: Record<string, unknown> = {url: url};

                            // append caption, remove element from blockquote
                            payload.caption = readCaptionFromElement(domNode);
                            const figcaption = domNode.querySelector('figcaption');
                            figcaption?.remove();

                            payload.html = domNode.innerHTML;

                            const node = new EmbedNode(payload);
                            return {node};
                        },
                        priority: 1 as const
                    };
                }
            }
            return null;
        },
        iframe: (nodeElem: HTMLElement) => {
            if (nodeElem.nodeType === 1 && nodeElem.tagName === 'IFRAME') {
                return {
                    conversion(domNode: HTMLElement) {
                        if (domNode.tagName !== 'IFRAME') {
                            return null;
                        }

                        const payload = _createPayloadForIframe(domNode as HTMLIFrameElement);

                        if (!payload) {
                            return null;
                        }

                        const node = new EmbedNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}

function _createPayloadForIframe(iframe: HTMLIFrameElement) {
    // If we don't have a src Or it's not an absolute URL, we can't handle this
    // This regex handles http://, https:// or //
    if (!iframe.src || !iframe.src.match(/^(https?:)?\/\//i)) {
        return;
    }

    // if it's a schemaless URL, convert to https
    if (iframe.src.match(/^\/\//)) {
        iframe.src = `https:${iframe.src}`;
    }

    const payload: Record<string, unknown> = {
        url: iframe.src
    };

    payload.html = iframe.outerHTML;

    return payload;
}
