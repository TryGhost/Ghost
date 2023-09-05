import React from 'react';

// Imports asynchronously to avoid including CodeMirror in the main bundle
const CodeEditor = React.lazy(() => import('./CodeEditorView.tsx'));

export default CodeEditor;
