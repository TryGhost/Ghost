import KoenigNestedEditorPlugin from '../plugins/KoenigNestedEditorPlugin';
import React from 'react';
import {BASIC_NODES, BASIC_TRANSFORMERS, KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index';
import {EmojiPickerPlugin} from '../plugins/EmojiPickerPlugin';
import type {EditorThemeClasses, LexicalEditor} from 'lexical';
import type {Transformer} from '@lexical/markdown';

interface PlaceholderProps {
    text?: string;
    className?: string;
}

const Placeholder = ({text = 'Type here', className = ''}: PlaceholderProps) => {
    // Note: we use line-clamp-1, instead of truncate because truncate adds 'white-space: nowrap', which often breaks overflows of parents in some cards
    return (
        <div className={`placeholder not-kg-prose pointer-events-none h-0 cursor-text overflow-visible`}>
            <div className={`line-clamp-1 translate-y-[-100%] xs:overflow-visible ${className}`}>{text}</div>
        </div>
    );
};

interface KoenigNestedEditorProps {
    initialEditor: LexicalEditor;
    initialEditorState?: string;
    initialTheme?: EditorThemeClasses;
    nodes?: 'basic' | 'minimal';
    placeholderText?: string;
    textClassName?: string;
    placeholderClassName?: string;
    autoFocus?: boolean;
    focusNext?: LexicalEditor | null;
    singleParagraph?: boolean;
    hasSettingsPanel?: boolean;
    defaultKoenigEnterBehaviour?: boolean;
    hiddenFormats?: string[];
    useDefaultClasses?: boolean;
    dataTestId?: string;
    children?: React.ReactNode;
}

const KoenigNestedEditor = ({
    initialEditor,
    initialEditorState,
    initialTheme,
    nodes = 'basic',
    placeholderText = '',
    textClassName = '',
    placeholderClassName = '',
    autoFocus = false,
    focusNext = null,
    singleParagraph = false,
    hasSettingsPanel = false,
    defaultKoenigEnterBehaviour = false,
    hiddenFormats = [],
    useDefaultClasses = true,
    dataTestId,
    children
}: KoenigNestedEditorProps) => {
    const initialNodes = nodes === 'minimal' ? MINIMAL_NODES : BASIC_NODES;
    const markdownTransformers = nodes === 'minimal' ? MINIMAL_TRANSFORMERS : BASIC_TRANSFORMERS;

    return (
        <KoenigNestedComposer
            initialEditor={initialEditor}
            initialEditorState={initialEditorState}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
        >
            <KoenigComposableEditor
                className={textClassName}
                dataTestId={dataTestId}
                hiddenFormats={hiddenFormats}
                inheritStyles={true}
                isDragEnabled={false}
                markdownTransformers={markdownTransformers as Transformer[]}
                placeholder={<Placeholder className={placeholderClassName} text={placeholderText} />}
                useDefaultClasses={useDefaultClasses}
            >
                {singleParagraph && <RestrictContentPlugin allowBr={false} paragraphs={1} />}

                {children}

                <KoenigNestedEditorPlugin
                    autoFocus={autoFocus}
                    defaultKoenigEnterBehaviour={defaultKoenigEnterBehaviour}
                    focusNext={focusNext ?? undefined}
                    hasSettingsPanel={hasSettingsPanel}
                />

                <EmojiPickerPlugin />

            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigNestedEditor;
