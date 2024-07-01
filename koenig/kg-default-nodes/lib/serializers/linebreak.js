export default {
    import: {
        br: (node) => {
            const isGoogleDocs = !!node.closest('[id^="docs-internal-guid-"]');

            // render nothing for GDoc line breaks in-between paragraphs
            // otherwise we end up with empty paragraphs
            if (
                isGoogleDocs &&
                node.previousElementSibling?.nodeName === 'P' &&
                node.nextElementSibling?.nodeName === 'P'
            ) {
                return {
                    conversion: () => null,
                    priority: 1
                };
            }

            // allow lower priority converter to handle (i.e. default LineBreakNode.importDOM)
            return null;
        }
    }
};
