export class BookmarkParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            figure: (nodeElem) => {
                const isKgBookmarkCard = nodeElem.classList?.contains('kg-bookmark-card');
                if (nodeElem.tagName === 'FIGURE' && isKgBookmarkCard) {
                    return {
                        conversion(domNode) {
                            const url = domNode?.querySelector('.kg-bookmark-container').href;
                            const icon = domNode?.querySelector('.kg-bookmark-icon').src;
                            const title = domNode?.querySelector('.kg-bookmark-title').textContent;
                            const description = domNode?.querySelector('.kg-bookmark-description').textContent;
                            const author = domNode?.querySelector('.kg-bookmark-author').textContent;
                            const publisher = domNode?.querySelector('.kg-bookmark-publisher').textContent;
                            const thumbnail = domNode?.querySelector('.kg-bookmark-thumbnail img').src;
                            const caption = domNode?.querySelector('figure.kg-bookmark-card figcaption').textContent;
                            const payload = {
                                url: url,
                                icon: icon,
                                title: title,
                                description: description,
                                author: author,
                                publisher: publisher,
                                thumbnail: thumbnail,
                                caption: caption
                            };
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
