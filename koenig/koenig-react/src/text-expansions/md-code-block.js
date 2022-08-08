const mdCodeBlock = (koenig) => {
    return {
        register: [{
            name: 'md_code',
            match: /^```([a-zA-Z0-9]*)(\s)$/,
            run(editor, matches) {
                const {range: {head, head: {section}}} = editor;
                const payload = {};

                // Skip if cursor is not at end of section
                if (!head.isTail()) {
                    return;
                }

                // Skip if section is a list item
                if (section.isListItem) {
                    return;
                }

                if (matches[1]) {
                    payload.language = matches[1];
                }

                if (matches[2] === '\n') {
                    koenig.skipNewline();
                }

                koenig.replaceWithCardSection('code', section.toRange(), payload);
            }
        }]
    };
};

export default mdCodeBlock;
