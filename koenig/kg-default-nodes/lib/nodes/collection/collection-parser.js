function getLayout(domNode) {
    if (domNode.classList.contains('kg-collection-card-list')) {
        return 'list';
    } else { // should have kg-collection-card-grid
        return 'grid';
    }
}

function getColumns(domNode) {
    if (domNode.classList.contains('columns-1')) {
        return 1;
    }
    if (domNode.classList.contains('columns-2')) {
        return 2;
    }
    if (domNode.classList.contains('columns-3')) {
        return 3;
    }
    if (domNode.classList.contains('columns-4')) {
        return 4;
    }
}

export function collectionParser(CollectionNode) {
    return {
        div: (nodeElem) => {
            const isCollectionNode = nodeElem.classList?.contains('kg-collection-card');
            if (nodeElem.tagName === 'DIV' && isCollectionNode) {
                return {
                    conversion(domNode) {
                        const postCount = parseInt(domNode.getAttribute('data-kg-collection-limit'));
                        const collection = domNode.getAttribute('data-kg-collection-slug');
                        const layout = getLayout(domNode);
                        const header = domNode.querySelector('.kg-collection-card-title')?.textContent || '';
                        const columns = layout === 'list' ? 3 : getColumns(domNode); // default to 3 if switched to grid

                        const payload = {
                            collection,
                            postCount,
                            layout,
                            columns,
                            header
                        };

                        const node = new CollectionNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}
