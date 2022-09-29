import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isNodeSelection, $setSelection} from 'lexical';

function useKoenigBehaviour({editor, containerElem}) {
    // deselect cards on mousedown outside of the editor container
    React.useEffect(() => {
        const onMousedown = (event) => {
            if (!containerElem.current.contains(event.target)) {
                editor.update(() => {
                    const selection = $getSelection();

                    if ($isNodeSelection(selection)) {
                        $setSelection(null);
                    }
                });
            }
        };

        window.addEventListener('mousedown', onMousedown);

        return () => {
            window.removeEventListener('mousedown', onMousedown);
        };
    }, [editor, containerElem]);

    return null;
}

export default function KoenigBehaviourPlugin({containerElem = document.querySelector('.koenig-editor')}) {
    const [editor] = useLexicalComposerContext();
    return useKoenigBehaviour({editor, containerElem});
}
