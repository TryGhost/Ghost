import type {ReactCodeMirrorRef} from '@uiw/react-codemirror';
import React, {Suspense, forwardRef} from 'react';
import type {CodeEditorProps} from './CodeEditorView';
import type {FetchKoenigLexical} from './HtmlEditor';

export type {CodeEditorProps, FetchKoenigLexical};

// Imported asynchronously to avoid including CodeMirror in the main bundle
const CodeEditorView = React.lazy(() => import('./CodeEditorView'));

const CodeEditor = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(function CodeEditor(props, ref) {
    return (
        <Suspense fallback={null}>
            <CodeEditorView {...props} ref={ref} />
        </Suspense>
    );
});

export default CodeEditor;
