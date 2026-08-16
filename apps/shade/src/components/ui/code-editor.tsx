import React, {Suspense, forwardRef} from 'react';

import type {CodeEditorProps} from '@/components/ui/code-editor-view';
import type {ReactCodeMirrorRef} from '@uiw/react-codemirror';

export type {CodeEditorProps};

const CodeEditorView = React.lazy(() => import('@/components/ui/code-editor-view'));

const CodeEditor = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(function CodeEditor(props, ref) {
    return (
        <Suspense fallback={null}>
            <CodeEditorView ref={ref} {...props} />
        </Suspense>
    );
});

CodeEditor.displayName = 'CodeEditor';

export {CodeEditor};
