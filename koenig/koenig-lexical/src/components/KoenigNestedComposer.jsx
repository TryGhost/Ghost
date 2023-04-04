import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';

const KoenigNestedComposer = ({initialEditor, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    const {isCollabActive} = useCollaborationContext();
    const {websocketProviderFactory} = React.useContext(KoenigComposerContext);

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
                    providerFactory={websocketProviderFactory}
                    shouldBootstrap={true}
                />
            ) : null }
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
