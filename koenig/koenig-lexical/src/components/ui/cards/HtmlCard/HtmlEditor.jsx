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
        syntaxHighlighting(editorHighlightStyle), // customizes syntax highlighting rules
        editorCSS,
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