import React from 'react';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';

const KoenigNestedComposer = ({initialEditor, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    return (
        <LexicalNestedComposer
            initialEditor={initialEditor}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
            skipCollabChecks={skipCollabChecks}
        >
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
