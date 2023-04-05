export class EmbedParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        // const self = this;

        return {
            // figure: (nodeElem) => {
            //     const isKgEmbedCard = nodeElem.classList?.contains('kg-embed-card');
            //     if (nodeElem.tagName === 'FIGURE' && isKgEmbedCard) {
            //         return {
            //             conversion(domNode) {
            //                 const url = domNode?.querySelector('.kg-embed-container').href;
            //                 const icon = domNode?.querySelector('.kg-embed-icon').src;
            //                 const title = domNode?.querySelector('.kg-embed-title').textContent;
            //                 const description = domNode?.querySelector('.kg-embed-description').textContent;
            //                 const author = domNode?.querySelector('.kg-embed-author').textContent;
            //                 const publisher = domNode?.querySelector('.kg-embed-publisher').textContent;
            //                 const thumbnail = domNode?.querySelector('.kg-embed-thumbnail img').src;
            //                 const caption = domNode?.querySelector('figure.kg-embed-card figcaption').textContent;
            //                 const payload = {
            //                     url: url,
            //                     icon: icon,
            //                     title: title,
            //                     description: description,
            //                     author: author,
            //                     publisher: publisher,
            //                     thumbnail: thumbnail,
            //                     caption: caption
            //                 };
            //                 const node = new self.NodeClass(payload);
            //                 return {node};
            //             },
            //             priority: 1
            //         };
            //     }
            //     return null;
            // }
        };
    }
}
