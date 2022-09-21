import React from 'react';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import DEFAULT_NODES from '../nodes/DefaultNodes';
import defaultTheme from '../themes/default';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error) {
    console.error(error); // eslint-disable-line
}

const defaultConfig = {
    namespace: 'KoenigEditor',
    theme: defaultTheme
};

const KoenigComposer = ({
    initialEditorState,
    nodes = [...DEFAULT_NODES],
    onError = defaultOnError,
    children
}) => {
    const initialConfig = React.useMemo(() => {
        return Object.assign({}, defaultConfig, {
            nodes,
            editorState: initialEditorState,
            onError
        });
    }, [initialEditorState, nodes, onError]);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            {children}
        </LexicalComposer>
    );
};

export default KoenigComposer;
