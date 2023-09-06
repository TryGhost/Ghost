import React, {Suspense} from 'react';
import type {CodeEditorProps} from './CodeEditorView.tsx';

// Imported asynchronously to avoid including CodeMirror in the main bundle
const CodeEditorView = React.lazy(() => import('./CodeEditorView.tsx'));

const CodeEditor = (props: CodeEditorProps) => {
    return (
        <Suspense fallback={null}>
            <CodeEditorView {...props} />
        </Suspense>
    );
};

export default CodeEditor;
