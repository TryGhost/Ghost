import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import WordCountPlugin from '../plugins/WordCountPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import type {EditorThemeClasses, Klass, LexicalEditor, LexicalNode} from 'lexical';

interface KoenigNestedComposerProps {
    initialEditor?: LexicalEditor;
    initialEditorState?: string;
    initialNodes?: ReadonlyArray<Klass<LexicalNode>>;
    initialTheme?: EditorThemeClasses;
    skipCollabChecks?: boolean;
    children?: React.ReactNode;
}

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialNodes, initialTheme, skipCollabChecks, children}: KoenigNestedComposerProps = {}) => {
    const {isCollabActive} = useCollaborationContext();
    const {createWebsocketProvider, onWordCountChangeRef} = React.useContext(KoenigComposerContext);

    return (
        <LexicalNestedComposer
            initialEditor={initialEditor as LexicalEditor}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
            skipCollabChecks={skipCollabChecks as true | undefined}
        >
            {isCollabActive && initialEditor ? (
                <CollaborationPlugin
                    id={initialEditor.getKey()}
                    initialEditorState={initialEditorState}
                    providerFactory={createWebsocketProvider as Parameters<typeof CollaborationPlugin>[0]['providerFactory']}
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
