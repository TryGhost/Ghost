import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function useSlashCardMenu(editor) {

}

export default function SlashCardMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    return useSlashCardMenu(editor);
}
