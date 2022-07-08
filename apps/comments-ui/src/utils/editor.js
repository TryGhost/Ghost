import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import Document from '@tiptap/extension-document';
import Blockquote from '@tiptap/extension-blockquote';

export function getEditorConfig({placeholder, autofocus = false, content = ''}) {
    return {
        extensions: [
            Document,
            Text,
            Paragraph,
            Link.configure({
                openOnClick: false
            }),
            Placeholder.configure({
                placeholder
            }),
            Blockquote.configure({})
        ],
        content,
        autofocus,
        editorProps: {
            attributes: {
                class: `gh-comment-content focus:outline-0`
            }
        }
    };
}

/** We need to post process the HTML from tiptap, because tiptap by default */
