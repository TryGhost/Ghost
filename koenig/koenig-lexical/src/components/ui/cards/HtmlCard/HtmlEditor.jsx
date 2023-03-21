import CodeMirror from '@uiw/react-codemirror';
import React from 'react';
import {EditorView, keymap, lineNumbers} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
// import {githubDark, githubLight} from '@uiw/codemirror-theme-github';
import {html as langHtml} from '@codemirror/lang-html';
import {minimalSetup} from '@uiw/codemirror-extensions-basic-setup';
import {standardKeymap} from '@codemirror/commands';
import {tags as t} from '@lezer/highlight';

export default function HtmlEditor({darkMode, html, updateHtml}) {
    const onChange = React.useCallback((value) => {
        updateHtml(value);
    }, [updateHtml]);

    const editorLightCSS = EditorView.theme({
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
        editorLightCSS, // customizes general editor appearance (does not include syntax highlighting)
        lineNumbers(), // adds line numbers to the gutter
        minimalSetup({defaultKeymap: false}), // disable defaultKeymap to prevent Mod+Enter from inserting new line
        keymap.of(standardKeymap), // add back in standardKeymap, which doesn't include Mod+Enter
        langHtml()
    ];

    return (
        <div className="not-kg-prose min-h-[170px]">
            <CodeMirror
                autoFocus={true} // autofocus the editor whenever it is rendered
                basicSetup={false} // basic setup includes unnecessary extensions
                extensions={extensions}
                // theme={darkMode ? githubDark : githubLight}
                value={html}
                onChange={onChange}
            />
        </div>
    );
}