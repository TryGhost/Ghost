import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';

// TODO: add NFT card parser
export class EmbedParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            figure: (nodeElem) => {
                if (nodeElem.nodeType === 1 && nodeElem.tagName === 'FIGURE') {
                    const iframe = nodeElem.querySelector('iframe');
                    if (iframe) {
                        return {
                            conversion(domNode) {
                                const payload = _createPayloadForIframe(iframe);

                                if (!payload) {
                                    return null;
                                }

                                payload.caption = readCaptionFromElement(domNode);

                                const node = new self.NodeClass(payload);
                                return {node};
                            },
                            priority: 1
                        };
                    }
                    const blockquote = nodeElem.querySelector('blockquote');
                    if (blockquote) {
                        return {
                            conversion(domNode) {
                                const link = domNode.querySelector('a');
                                if (!link) {
                                    return null;
                                }

                                let url = link.href;

                                // If we don't have a url, or it's not an absolute URL, we can't handle this
                                if (!url || !url.match(/^https?:\/\//i)) {
                                    return null;
                                }

                                const payload = {
                                    url: url,
                                    html: domNode.innerHTML
                                };
                                payload.caption = readCaptionFromElement(domNode);

                                const node = new self.NodeClass(payload);
                                return {node};
                            },
                            priority: 1
                        };
                    }
                }
                return null;
            },
            iframe: (nodeElem) => {
                if (nodeElem.nodeType === 1 && nodeElem.tagName === 'IFRAME') {
                    return {
                        conversion(domNode) {
                            const payload = _createPayloadForIframe(domNode);

                            if (!payload) {
                                return null;
                            }

                            const node = new self.NodeClass(payload);
                            return {node};
                        },
                        priority: 1
                    };
                }
                return null;
            },
            div: (nodeElem) => {
                if (nodeElem.nodeType === 1 && nodeElem.tagName === 'DIV' && nodeElem.className.match(/graf--mixtapeEmbed/)) {
                    return {
                        conversion(domNode) {
                            // Grab the relevant elements - Anchor wraps most of the data
                            const anchorElement = domNode.querySelector('.markup--mixtapeEmbed-anchor');
                            const titleElement = anchorElement.querySelector('.markup--mixtapeEmbed-strong');
                            const descElement = anchorElement.querySelector('.markup--mixtapeEmbed-em');
                            // Image is a top level field inside it's own a tag
                            const imgElement = domNode.querySelector('.mixtapeImage');

                            // Grab individual values from the elements
                            const url = anchorElement.href;
                            let title = '';
                            let description = '';

                            if (titleElement && titleElement.innerHTML) {
                                title = cleanBasicHtml(titleElement.innerHTML);
                                // Cleanup anchor so we can see what's left now that we've processed title
                                anchorElement.removeChild(titleElement);
                            }
                    
                            if (descElement && descElement.innerHTML) {
                                description = cleanBasicHtml(descElement.innerHTML);
                                // Cleanup anchor so we can see what's left now that we've processed description
                                anchorElement.removeChild(descElement);
                            }

                            // // Format our preferred structure.
                            let metadata = {
                                url,
                                title,
                                description
                            };

                            // Publisher is the remaining text in the anchor, once title & desc are removed
                            let publisher = cleanBasicHtml(anchorElement.innerHTML);
                            if (publisher) {
                                metadata.publisher = publisher;
                            }

                            // Image is optional,
                            // The element usually still exists with an additional has.mixtapeImage--empty class and has no background image
                            if (imgElement && imgElement.style['background-image']) {
                                metadata.thumbnail = imgElement.style['background-image'].match(/url\(([^)]*?)\)/)[1];
                            }

                            let payload = {url, metadata};
                            const node = new self.NodeClass(payload);
                            return {node};
                        },
                        priority: 1
                    };
                }
                return null;
            }
        };
    }
}

function _createPayloadForIframe(iframe) {
    // If we don't have a src Or it's not an absolute URL, we can't handle this
    // This regex handles http://, https:// or //
    if (!iframe.src || !iframe.src.match(/^(https?:)?\/\//i)) {
        return;
    }

    // if it's a schemaless URL, convert to https
    if (iframe.src.match(/^\/\//)) {
        iframe.src = `https:${iframe.src}`;
    }

    let payload = {
        url: iframe.src
    };

    payload.html = iframe.outerHTML;

    return payload;
}