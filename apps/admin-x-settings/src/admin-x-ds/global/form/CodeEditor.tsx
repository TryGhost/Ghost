import React, {Suspense, forwardRef} from 'react';
import type {CodeEditorProps} from './CodeEditorView.tsx';
import type {ReactCodeMirrorRef} from '@uiw/react-codemirror';

// Imported asynchronously to avoid including CodeMirror in the main bundle
const CodeEditorView = React.lazy(() => import('./CodeEditorView.tsx'));

const CodeEditor = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(function CodeEditor(props, ref) {
    return (
        <Suspense fallback={null}>
            <CodeEditorView {...props} ref={ref} />
        </Suspense>
    );
});

export default CodeEditor;
