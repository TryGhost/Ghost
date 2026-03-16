import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import WordCountPlugin from '../plugins/WordCountPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    const {isCollabActive} = useCollaborationContext();
    const {createWebsocketProvider, onWordCountChangeRef} = React.useContext(KoenigComposerContext);

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
            {onWordCountChangeRef?.current ? (
                <WordCountPlugin onChange={onWordCountChangeRef.current} />
            ) : null}
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
