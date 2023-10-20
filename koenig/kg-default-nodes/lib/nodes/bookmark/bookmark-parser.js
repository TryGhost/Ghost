export function parseBookmarkNode(BookmarkNode) {
    return {
        figure: (nodeElem) => {
            const isKgBookmarkCard = nodeElem.classList?.contains('kg-bookmark-card');
            if (nodeElem.tagName === 'FIGURE' && isKgBookmarkCard) {
                return {
                    conversion(domNode) {
                        const url = domNode?.querySelector('.kg-bookmark-container')?.getAttribute('href');
                        const icon = domNode?.querySelector('.kg-bookmark-icon')?.src;
                        const title = domNode?.querySelector('.kg-bookmark-title')?.textContent;
                        const description = domNode?.querySelector('.kg-bookmark-description')?.textContent;
                        const author = domNode?.querySelector('.kg-bookmark-publisher')?.textContent; // NOTE: This is NOT in error. The classes are reversed for theme backwards-compatibility.
                        const publisher = domNode?.querySelector('.kg-bookmark-author')?.textContent; // NOTE: This is NOT in error. The classes are reversed for theme backwards-compatibility.
                        const thumbnail = domNode?.querySelector('.kg-bookmark-thumbnail img')?.src;
                        const caption = domNode?.querySelector('figure.kg-bookmark-card figcaption')?.textContent;
                        const payload = {
                            url: url,
                            metadata: {
                                icon: icon,
                                title: title,
                                description: description,
                                author: author,
                                publisher: publisher,
                                thumbnail: thumbnail
                            },
                            caption: caption
                        };
                        const node = new BookmarkNode(payload);
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

                        domNode.querySelector('br').remove();

                        // Grab individual values from the elements
                        const url = anchorElement.getAttribute('href');
                        let title = '';
                        let description = '';
                        let thumbnail = '';

                        if (titleElement && titleElement.innerHTML) {
                            title = titleElement.innerHTML.trim();
                            // Cleanup anchor so we can see what's left now that we've processed title
                            anchorElement.removeChild(titleElement);
                        }

                        if (descElement && descElement.innerHTML) {
                            description = descElement.innerHTML.trim();
                            // Cleanup anchor so we can see what's left now that we've processed description
                            anchorElement.removeChild(descElement);
                        }

                        // Publisher is the remaining text in the anchor, once title & desc are removed
                        let publisher = anchorElement.innerHTML.trim();

                        // Image is optional,
                        // The element usually still exists with an additional has.mixtapeImage--empty class and has no background image
                        if (imgElement && imgElement.style['background-image']) {
                            thumbnail = imgElement.style['background-image'].match(/url\(([^)]*?)\)/)[1];
                        }

                        let payload = {url,
                            metadata: {
                                title,
                                description,
                                publisher,
                                thumbnail
                            }};
                        const node = new BookmarkNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}
