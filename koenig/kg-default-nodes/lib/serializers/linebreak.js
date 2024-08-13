export default {
    import: {
        br: (node) => {
            const isGoogleDocs = !!node.closest('[id^="docs-internal-guid-"]');
            const headings = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
            const lists = ['UL', 'OL', 'DL'];

            // Remove empty paragraphs when copy/pasting from Google docs:
            // - Between two paragraphs (P and P)
            // - Between a list and a paragraph (UL/OL/DL and P), and vice versa
            // - Between a heading and a paragraph (H1-H6 and P), and vice versa
            if (isGoogleDocs) {
                if ((
                    node.previousElementSibling?.nodeName === 'P' &&
                    node.nextElementSibling?.nodeName === 'P'
                ) || (
                    [...headings, ...lists].includes(node.previousElementSibling?.nodeName) &&
                    node.nextElementSibling?.nodeName === 'P'
                ) || (
                    node.previousElementSibling?.nodeName === 'P' &&
                    [...headings, ...lists].includes(node.nextElementSibling?.nodeName)
                )) {
                    return {
                        conversion: () => null,
                        priority: 1
                    };
                }
            }

            // allow lower priority converter to handle (i.e. default LineBreakNode.importDOM)
            return null;
        }
    }
};
