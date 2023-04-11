import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createParagraphNode, $getRoot} from 'lexical';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    const {isCollabActive} = useCollaborationContext();
    const {createWebsocketProvider} = React.useContext(KoenigComposerContext);

    React.useLayoutEffect(() => {
        if (!isCollabActive && initialEditorState) {
            const parsedEditorState = initialEditor.parseEditorState(initialEditorState);
            if (!parsedEditorState.isEmpty()) {
                initialEditor.setEditorState(parsedEditorState);
            } else {
                // we need an initial paragraph otherwise the editor will not be able to focus
                initialEditor.update(() => {
                    $getRoot().clear();
                    $getRoot().append($createParagraphNode());
                });
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <LexicalNestedComposer
            initialEditor={initialEditor}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
            skipCollabChecks={skipCollabChecks}
        >
            {isCollabActive ? (
                <CollaborationPlugin
                    id={initialEditor.getKey()}
                    initialEditorState={initialEditorState}
                    providerFactory={createWebsocketProvider}
                    shouldBootstrap={true}
                />
            ) : null }
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
