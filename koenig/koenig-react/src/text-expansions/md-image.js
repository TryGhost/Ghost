const mdImage = (koenig) => {
    return {
        register: [{
            name: 'md_image',
            match: /^\/image$/,
            run(editor) {
                let {range: {head, head: {section}}} = editor;

                // Skip if cursor is not at end of section
                if (!head.isTail()) {
                    return;
                }

                // Skip if section is a list item
                if (section.isListItem) {
                    return;
                }

                koenig.replaceWithCardSection('image', section.toRange());
            }
        }]
    };
};

export default mdImage;
