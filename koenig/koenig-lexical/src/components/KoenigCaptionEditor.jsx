import React from 'react';
import {HtmlOutputPlugin, KoenigComposableEditor, KoenigComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute top-0 left-0 m-0 min-w-full cursor-text font-sans text-sm font-normal tracking-wide text-grey-500 ">
            {text}
        </div>
    );
};

const KoenigCaptionEditor = ({paragraphs = 1, html, setHtml, placeholderText, readOnly}) => {
    return (
        <KoenigComposer
            nodes={MINIMAL_NODES}
        >
            <KoenigComposableEditor
                className="koenig-lexical-caption"
                markdownTransformers={MINIMAL_TRANSFORMERS}
                placeholder={<Placeholder text={placeholderText} />}
                readOnly={readOnly}
            >
                <RestrictContentPlugin paragraphs={paragraphs} />
                <HtmlOutputPlugin html={html} setHtml={setHtml} />
            </KoenigComposableEditor>
        </KoenigComposer>
    );
};

export default KoenigCaptionEditor;
