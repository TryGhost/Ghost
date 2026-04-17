export default {
    import: {
        br: (node) => {
            const isGoogleDocs = !!node.closest('[id^="docs-internal-guid-"]');
            const previousNodeName = node.previousElementSibling?.nodeName;
            const nextNodeName = node.nextElementSibling?.nodeName;
            const headings = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
            const lists = ['UL', 'OL', 'DL'];

            // Remove empty paragraphs when copy/pasting from Google docs:
            // - Between two paragraphs (P and P)
            // - Between multiple linebreaks (BR and BR)
            // - Between a list and a paragraph (UL/OL/DL and P), and vice versa
            // - Between a heading and a paragraph (H1-H6 and P), and vice versa
            if (isGoogleDocs) {
                if (
                    (previousNodeName === 'P' && nextNodeName === 'P') ||
                    (previousNodeName === 'BR' || nextNodeName === 'BR') ||
                    ([...headings, ...lists].includes(previousNodeName) && nextNodeName === 'P') ||
                    (previousNodeName === 'P' && [...headings, ...lists].includes(nextNodeName))
                ) {
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
