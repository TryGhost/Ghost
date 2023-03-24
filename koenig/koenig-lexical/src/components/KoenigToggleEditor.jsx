import React from 'react';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {BASIC_NODES, BASIC_TRANSFORMERS, HtmlOutputPlugin, KoenigComposableEditor, KoenigComposer, RestrictContentPlugin} from '../index.js';

const Placeholder = ({text = 'Type here', className = ''}) => {
    return (
        <div className={`not-kg-prose pointer-events-none absolute top-0 left-0 min-w-full cursor-text ${className}`}>
            {text}
        </div>
    );
};

const KoenigToggleEditor = ({text, setText, placeholderText, textClassName, placeholderClassName, readOnly, autoFocus = false, singleParagraph = false}) => {
    return (
        <KoenigComposer
            nodes={BASIC_NODES}
        >
            <KoenigComposableEditor
                className={textClassName}
                isDragEnabled={false}
                markdownTransformers={BASIC_TRANSFORMERS}
                placeholder={<Placeholder className={placeholderClassName} text={placeholderText} />}
                readOnly={readOnly}
            >
                {singleParagraph && <RestrictContentPlugin paragraphs={1} />}
                {autoFocus && <AutoFocusPlugin />}
                <HtmlOutputPlugin html={text} setHtml={setText} />
            </KoenigComposableEditor>
        </KoenigComposer>
    );
};

export default KoenigToggleEditor;
