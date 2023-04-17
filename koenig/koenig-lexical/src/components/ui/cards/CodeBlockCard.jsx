import CodeMirror from '@uiw/react-codemirror';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {EditorView, keymap, lineNumbers} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {css} from '@codemirror/lang-css';
import {html} from '@codemirror/lang-html';
import {javascript} from '@codemirror/lang-javascript';
import {minimalSetup} from '@uiw/codemirror-extensions-basic-setup';
import {standardKeymap} from '@codemirror/commands';
import {tags as t} from '@lezer/highlight';

export function CodeEditor({code, language, updateCode, updateLanguage}) {
    const [showLanguage, setShowLanguage] = React.useState(true);

    // show the language input when the mouse moves
    React.useEffect(() => {
        const onMouseMove = () => {
            setShowLanguage(true);
        };

        window.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    const onChange = React.useCallback((value) => {
        setShowLanguage(false); // hide language input whenever the user types in the editor
        updateCode(value);
    }, [updateCode]);

    const onLanguageChange = React.useCallback((event) => {
        updateLanguage(event.target.value);
    }, [updateLanguage]);

    const editorCSS = EditorView.theme({
        '&.cm-editor': {
            background: '#F4F5F6'
        },
        '&.cm-focused': {
            outline: '0'
        },
        '&.cm-editor .cm-content': {
            padding: '7px 0'
        },
        '&.cm-editor .cm-scroller': {
            overflow: 'auto'
        },
        '&.cm-editor .cm-gutters': {
            background: 'none',
            border: 'none',
            fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace;',
            color: '#CED4D9',
            lineHeight: '2.25rem'
        },
        '&.cm-editor .cm-gutter': {
            minHeight: '170px'
        },
        '&.cm-editor .cm-lineNumbers': {
            padding: '0 0 0 5px'
        },
        '&.cm-editor .cm-foldGutter': {
            width: '0'
        },
        '&.cm-editor .cm-line': {
            padding: '0 .8rem',
            color: '#394047',
            fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace;',
            fontSize: '1.6rem',
            lineHeight: '2.25rem'
        },
        '&.cm-editor .cm-activeLine, &.cm-editor .cm-activeLineGutter': {
            background: 'none'
        }
    });

    const editorHighlightStyle = HighlightStyle.define([
        {tag: t.keyword, color: '#5A5CAD', fontWeight: 'bold'},
        {tag: t.atom, color: '#6C8CD5'},
        {tag: t.number, color: '#116644'},
        {tag: t.definition(t.variableName), textDecoration: 'underline'},
        {tag: t.variableName, color: 'black'},
        {tag: t.comment, color: '#0080FF', fontStyle: 'italic'},
        {tag: [t.string, t.special(t.brace)], color: 'red'},
        {tag: t.meta, color: 'yellow'},
        {tag: t.bracket, color: '#cc7'},
        {tag: t.tagName, color: '#3F7F7F'},
        {tag: t.attributeName, color: '#7F007F'}
    ]);

    // Base extensions for the CodeMirror editor
    const extensions = [
        syntaxHighlighting(editorHighlightStyle), // customizes syntax highlighting rules
        editorCSS, // customizes general editor appearance (does not include syntax highlighting)
        lineNumbers(), // adds line numbers to the gutter
        minimalSetup({defaultKeymap: false}), // disable defaultKeymap to prevent Mod+Enter from inserting new line
        keymap.of(standardKeymap) // add back in standardKeymap, which doesn't include Mod+Enter
    ];

    // If provided language is supported, add the corresponding extension
    const languageMap = {
        javascript: javascript,
        html: html,
        css: css
    };
    const highlighter = languageMap[language?.toLowerCase().trim()] || null;
    if (highlighter) {
        extensions.push(highlighter());
    }

    return (
        <div className="not-kg-prose min-h-[170px] bg-[#F4F5F6]">
            <CodeMirror
                autoFocus={true} // autofocus the editor whenever it is rendered
                basicSetup={false} // basic setup includes unnecessary extensions
                extensions={extensions}
                value={code}
                onChange={onChange}
            />
            <input
                aria-label="Code card language"
                className={`z-999 absolute top-1.5 right-1.5 w-1/5 rounded border border-grey-300 p-1 font-sans text-[1.3rem] leading-4 text-grey-900 transition-opacity focus-visible:outline-none ${showLanguage ? 'opacity-100' : 'opacity-0'}`}
                data-testid="code-card-language"
                placeholder="Language..."
                type="text"
                value={language}
                onChange={onLanguageChange}
            />
        </div>
    );
}

// TODO: update caption use/handling
export function CodeBlock({caption, code, language}) {
    if (caption && caption.length > 0) {
        return (
            <div className="not-kg-prose">
                <figure>
                    <pre className="rounded border border-grey-200 bg-grey-100 px-2 py-[6px] font-mono text-[1.6rem] leading-9 text-grey-900">
                        <code className={(language && `language-${language}`)}>
                            {code}
                        </code>
                    </pre>
                    <div className="absolute top-2 right-2 flex items-center justify-center px-1">
                        <span className="block font-sans text-sm font-medium leading-normal text-grey">{language}</span>
                    </div>
                </figure>
            </div>
        );
    } else {
        return (
            <div className="not-kg-prose">
                <pre className="rounded border border-grey-200 bg-grey-100 px-2 py-[6px] font-mono text-[1.6rem] leading-9 text-grey-900">
                    <code className={(language && `language-${language}`)}>
                        {code}
                    </code>
                </pre>
                <div className="absolute top-2 right-2 flex items-center justify-center px-1">
                    <span className="block font-sans text-sm font-medium leading-normal text-grey">{language}</span>
                </div>
            </div>
        );
    }
}

export function CodeBlockCard({captionEditor, captionEditorInitialState, code, isEditing, isSelected, language, updateCode, updateLanguage, setCaption}) {
    if (isEditing) {
        return (
            <CodeEditor
                code={code}
                language={language}
                updateCode={updateCode}
                updateLanguage={updateLanguage}
            />
        );
    } else {
        return (
            <>
                {/* <CodeBlock caption={caption} code={code} language={language} /> */}
                <CodeBlock code={code} language={language} />
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for code block (optional)"
                    isSelected={isSelected}
                />
            </>
        );
    }
}

CodeEditor.propTypes = {
    code: PropTypes.string,
    language: PropTypes.string,
    updateCode: PropTypes.func,
    updateLanguage: PropTypes.func
};

CodeBlock.propTypes = {
    code: PropTypes.string,
    language: PropTypes.string
};

CodeBlockCard.propTypes = {
    code: PropTypes.string,
    language: PropTypes.string,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.string
};
