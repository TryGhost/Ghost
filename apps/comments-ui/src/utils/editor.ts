import Blockquote from '@tiptap/extension-blockquote';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import {EditorOptions} from '@tiptap/core';

export function getEditorConfig({placeholder, autofocus = false, content = ''}: {placeholder: string; autofocus?: boolean; content?: string}): Partial<EditorOptions> {
    return {
        extensions: [
            Document,
            Text,
            Paragraph,
            Link.configure({
                openOnClick: false
            }),
            Placeholder.configure({
                placeholder,
                showOnlyWhenEditable: false
            }),
            Blockquote.configure({}),

            // Enable shift + enter to insert <br> tags
            HardBreak.configure({})
        ],
        content,
        autofocus,
        editorProps: {
            attributes: {
                class: `gh-comment-content focus:outline-0`,
                'data-testid': 'editor'
            }
        },
        parseOptions: {
            preserveWhitespace: 'full'
        }
    };
}

/** We need to post process the HTML from tiptap, because tiptap by default */
