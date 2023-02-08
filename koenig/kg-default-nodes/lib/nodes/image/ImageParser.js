import cleanBasicHtml from '@tryghost/kg-clean-basic-html';

function readImageAttributesFromNode(node) {
    const attrs = {};

    if (node.src) {
        attrs.src = node.src;
    }

    if (node.width) {
        attrs.width = node.width;
    } else if (node.dataset && node.dataset.width) {
        attrs.width = parseInt(node.dataset.width, 10);
    }

    if (node.height) {
        attrs.height = node.height;
    } else if (node.dataset && node.dataset.height) {
        attrs.height = parseInt(node.dataset.height, 10);
    }

    if ((!node.width && !node.height) && node.getAttribute('data-image-dimensions')) {
        const [, width, height] = (/^(\d*)x(\d*)$/gi).exec(node.getAttribute('data-image-dimensions'));
        attrs.width = parseInt(width, 10);
        attrs.height = parseInt(height, 10);
    }

    if (node.alt) {
        attrs.alt = node.alt;
    }

    if (node.title) {
        attrs.title = node.title;
    }

    if (node.parentNode.tagName === 'A') {
        const href = node.parentNode.href;

        if (href !== attrs.src) {
            attrs.href = href;
        }
    }

    return attrs;
}

function addFigCaptionToPayload(node, payload, {selector = 'figcaption', options}) {
    let figcaptions = Array.from(node.querySelectorAll(selector));

    if (figcaptions.length) {
        figcaptions.forEach((caption) => {
            let cleanHtml = options?.cleanBasicHtml ? options.cleanBasicHtml(caption.innerHTML) : caption.innerHTML;
            payload.caption = payload.caption ? `${payload.caption} / ${cleanHtml}` : cleanHtml;
            caption.remove(); // cleanup this processed element
        });
    }
}

export class ImageParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            img: () => ({
                conversion(domNode) {
                    if (domNode.tagName === 'IMG') {
                        const {src, width, height, alt: altText, title} = readImageAttributesFromNode(domNode);

                        const node = new self.NodeClass({altText, src, title, width, height});
                        return {node};
                    }

                    return null;
                },
                priority: 1
            }),
            figure: (nodeElem) => {
                if (!nodeElem.querySelector('img')) {
                    return null;
                }
                return {
                    conversion(domNode) {
                        const img = domNode.querySelector('img');
                        const kgClass = domNode.className.match(/kg-width-(wide|full)/);
                        const grafClass = domNode.className.match(/graf--layout(FillWidth|OutsetCenter)/);

                        if (!img) {
                            return null;
                        }

                        const payload = readImageAttributesFromNode(img);

                        if (kgClass) {
                            payload.cardWidth = kgClass[1];
                        } else if (grafClass) {
                            payload.cardWidth = grafClass[1] === 'FillWidth' ? 'full' : 'wide';
                        }
                        const options = {
                            cleanBasicHtml: (html) => {
                                const cleanedHtml = cleanBasicHtml(html, {
                                    createDocument: (_html) => {
                                        const newDoc = domNode.ownerDocument.implementation.createHTMLDocument();
                                        newDoc.body.innerHTML = _html;
                                        return newDoc;
                                    }
                                });
                                return cleanedHtml;
                            }
                        };
                        addFigCaptionToPayload(domNode, payload, {options});

                        const {src, width, height, alt: altText, title, caption, cardWidth} = payload;
                        const node = new self.NodeClass({altText, src, title, width, height, caption, cardWidth});
                        return {node};
                    },
                    priority: 1
                };
            }
        };
    }
}
