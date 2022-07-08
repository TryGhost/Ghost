import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import Document from '@tiptap/extension-document';

export function getEditorConfig({placeholder, autofocus = false}) {
    return {
        extensions: [
            Document,
            Text,
            Paragraph,
            Link.configure({
                openOnClick: false,
                // Add these HTML attributes to all the <a> links
                // Warning: we need to do backend changes to make sure the sanitizer always picks the same class for links
                HTMLAttributes: {
                    class: 'underline'
                }
            }),
            Placeholder.configure({
                placeholder
            })
        ],
        content: '',
        autofocus,
        editorProps: {
            attributes: {
                class: `focus:outline-0`
            }
        }
    };
}
