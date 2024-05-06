import CodeMirror from '@uiw/react-codemirror';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
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
    const {darkMode} = React.useContext(KoenigComposerContext);

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

    const editorLightCSS = EditorView.theme({
        '&.cm-editor': {
            background: 'transparent'
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
            padding: '0'
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
        },
        '&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor': {
            borderLeft: '1.2px solid black'
        }
    });

    const editorDarkCSS = EditorView.theme({
        '&.cm-editor': {
            background: 'transparent'
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
            color: 'rgb(108, 118, 127);',
            lineHeight: '2.25rem'
        },
        '&.cm-editor .cm-gutter': {
            minHeight: '170px'
        },
        '&.cm-editor .cm-lineNumbers': {
            padding: '0'
        },
        '&.cm-editor .cm-foldGutter': {
            width: '0'
        },
        '&.cm-editor .cm-line': {
            padding: '0 .8rem',
            color: 'rgb(210, 215, 218)',
            fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace;',
            fontSize: '1.6rem',
            lineHeight: '2.25rem'
        },
        '&.cm-editor .cm-activeLine, &.cm-editor .cm-activeLineGutter': {
            background: 'none'
        },
        '&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor': {
            borderLeft: '1.2px solid white'
        }

    });

    const editorLightHighlightStyle = HighlightStyle.define([
        {tag: t.keyword, color: '#5A5CAD'},
        {tag: t.atom, color: '#6C8CD5'},
        {tag: t.number, color: '#116644'},
        {tag: t.definition(t.variableName), textDecoration: 'underline'},
        {tag: t.variableName, color: 'black'},
        {tag: t.comment, color: '#0080FF', fontStyle: 'italic', background: 'rgba(0,0,0,.05)'},
        {tag: [t.string, t.special(t.brace)], color: '#183691'},
        {tag: t.meta, color: 'yellow'},
        {tag: t.bracket, color: '#63a35c'},
        {tag: t.tagName, color: '#63a35c'},
        {tag: t.attributeName, color: '#795da3'}
    ]);

    const editorDarkHighlightStyle = HighlightStyle.define([
        {tag: t.keyword, color: '#795da3'},
        {tag: t.atom, color: '#6C8CD5'},
        {tag: t.number, color: '#63a35c'},
        {tag: t.definition(t.variableName), textDecoration: 'underline'},
        {tag: t.variableName, color: 'white'},
        {tag: t.comment, color: '#0080FF', fontStyle: 'italic', background: 'rgba(0,0,0,.05)'},
        {tag: [t.string, t.special(t.brace)], color: 'rgb(72, 110, 225)'},
        {tag: t.meta, color: 'yellow'},
        {tag: t.bracket, color: '#63a35c'},
        {tag: t.tagName, color: '#63a35c'},
        {tag: t.attributeName, color: '#795da3'},
        {tag: [t.className, t.propertyName], color: 'rgb(72, 110, 225)'}
    ]);

    const editorCSS = darkMode ? editorDarkCSS : editorLightCSS;
    const editorHighlightStyle = darkMode ? editorDarkHighlightStyle : editorLightHighlightStyle;

    // Base extensions for the CodeMirror editor
    const extensions = [
        EditorView.lineWrapping, // wraps lines that exceed the viewport width
        syntaxHighlighting(editorHighlightStyle), // customizes syntax highlighting rules
        editorCSS, // customizes general editor appearance (does not include syntax highlighting)
        lineNumbers(), // adds line numbers to the gutter
        minimalSetup({defaultKeymap: false}), // disable defaultKeymap to prevent Mod+Enter from inserting new line
        keymap.of(standardKeymap) // add back in standardKeymap, which doesn't include Mod+Enter
    ];

    // If provided language is supported, add the corresponding extension
    const languageMap = {
        javascript: javascript,
        js: javascript,
        html: html,
        css: css
    };
    const highlighter = languageMap[language?.toLowerCase().trim()] || null;
    if (highlighter) {
        extensions.push(highlighter());
    }

    return (
        <div className="not-kg-prose min-h-[170px]">
            <CodeMirror
                autoFocus={true} // autofocus the editor whenever it is rendered
                basicSetup={false} // basic setup includes unnecessary extensions
                extensions={extensions}
                value={code}
                onChange={onChange}
            />
            <input
                aria-label="Code card language"
                className={`z-999 absolute right-1.5 top-1.5 w-1/5 rounded-md border border-grey-300 px-2 py-1 font-sans text-[1.3rem] leading-4 text-grey-900 transition-opacity focus-visible:outline-none dark:border-grey-900 dark:text-grey-400 ${showLanguage ? 'opacity-100' : 'opacity-0'}`}
                data-testid="code-card-language"
                placeholder="Language..."
                type="text"
                value={language}
                onChange={onLanguageChange}
            />
        </div>
    );
}

export function CodeBlock({code, darkMode, language}) {
    const preClass = darkMode
        ? `rounded-md border border-grey-950 bg-grey-950 px-2 py-[6px] font-mono text-[1.6rem] leading-9 text-grey-400 whitespace-pre-wrap`
        : `rounded-md border border-grey-200 bg-grey-100 px-2 py-[6px] font-mono text-[1.6rem] leading-9 text-grey-900 whitespace-pre-wrap`;
    return (
        <div className="not-kg-prose">
            <pre className={preClass}>
                <code className={(language && `language-${language}`)}>
                    {code}
                </code>
            </pre>
            <div className="absolute right-2 top-2 flex items-center justify-center px-1">
                <span className="block font-sans text-sm font-medium leading-normal text-grey">{language}</span>
            </div>
        </div>
    );
}

export function CodeBlockCard({captionEditor, captionEditorInitialState, code, darkMode, isEditing, isSelected, language, updateCode, updateLanguage}) {
    if (isEditing) {
        return (
            <CodeEditor
                code={code}
                darkMode={darkMode}
                language={language}
                updateCode={updateCode}
                updateLanguage={updateLanguage}
            />
        );
    } else {
        return (
            <>
                <CodeBlock code={code} darkMode={darkMode} language={language} />
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for code block (optional)"
                    dataTestId="codeblock-caption"
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
    darkMode: PropTypes.bool,
    language: PropTypes.string
};

CodeBlockCard.propTypes = {
    code: PropTypes.string,
    darkMode: PropTypes.bool,
    language: PropTypes.string,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.object,
    isEditing: PropTypes.bool,
    isSelected: PropTypes.bool,
    updateCode: PropTypes.func,
    updateLanguage: PropTypes.func
};
