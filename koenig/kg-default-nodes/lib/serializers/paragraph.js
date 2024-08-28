export default {
    import: {
        p: (node) => {
            const isGoogleDocs = !!node.closest('[id^="docs-internal-guid-"]');

            // Google docs wraps dividers in paragraphs, without text content
            // Remove them to avoid creating empty paragraphs in the editor
            if (isGoogleDocs && node.textContent === '') {
                return {
                    conversion: () => null,
                    priority: 1
                };
            }

            return null;
        }
    }
};
