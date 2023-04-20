import KoenigNestedEditorPlugin from '../plugins/KoenigNestedEditorPlugin.jsx';
import React from 'react';
import {BASIC_NODES, BASIC_TRANSFORMERS, KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';

const Placeholder = ({text = 'Type here', className = ''}) => {
    return (
        <div className={`not-kg-prose pointer-events-none absolute top-0 left-0 min-w-full cursor-text ${className}`}>
            {text}
        </div>
    );
};

const KoenigNestedEditor = ({
    initialEditor,
    initialEditorState,
    nodes = 'basic',
    placeholderText = '',
    textClassName = '',
    placeholderClassName = '',
    autoFocus = false,
    focusNext = null,
    singleParagraph = false,
    disableKoenigStyles = false
}) => {
    const initialNodes = nodes === 'minimal' ? MINIMAL_NODES : BASIC_NODES;
    const markdownTransformers = nodes === 'minimal' ? MINIMAL_TRANSFORMERS : BASIC_TRANSFORMERS;

    return (
        <KoenigNestedComposer
            initialEditor={initialEditor}
            initialEditorState={initialEditorState}
            initialNodes={initialNodes}
        >
            <KoenigComposableEditor
                className={textClassName}
                disableKoenigStyles={disableKoenigStyles}
                markdownTransformers={markdownTransformers}
                placeholder={<Placeholder className={placeholderClassName} text={placeholderText} />}
            >
                {singleParagraph && <RestrictContentPlugin paragraphs={1} />}
                <KoenigNestedEditorPlugin autoFocus={autoFocus} focusNext={focusNext} />
            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigNestedEditor;
