import {EditorView, keymap, lineNumbers} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {history, historyKeymap, standardKeymap} from '@codemirror/commands';
import {minimalSetup} from '@uiw/codemirror-extensions-basic-setup';
import {tags as t} from '@lezer/highlight';

const disableHistoryGroupingForTests = import.meta.env.VITE_TEST;

// Static theme and highlight objects — hoisted to module scope to avoid
// recreating them on every render. CodeMirror tracks extensions by reference
// identity, so new objects force expensive reconfiguration.

export const lightCSS = EditorView.theme({
    '&.cm-editor': {
        background: 'transparent'
    },
    '&.cm-focused': {
        outline: '0'
    },
    '&.cm-editor .cm-content': {
        padding: '7px 0'
    },
    '&.cm-editor .cm-content, &.cm-editor .cm-gutter': {
        minHeight: '170px'
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

export const darkCSS = EditorView.theme({
    '&.cm-editor': {
        background: 'transparent'
    },
    '&.cm-focused': {
        outline: '0'
    },
    '&.cm-editor .cm-content': {
        padding: '7px 0'
    },
    '&.cm-editor .cm-content, &.cm-editor .cm-gutter': {
        minHeight: '170px'
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

export const lightHighlightStyle = HighlightStyle.define([
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

export const darkHighlightStyle = HighlightStyle.define([
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

const sharedExtensions = [
    EditorView.lineWrapping,
    lineNumbers(),
    minimalSetup({defaultKeymap: false, history: false}),
    keymap.of([...historyKeymap, ...standardKeymap]),
    history({
        joinToEvent: disableHistoryGroupingForTests ? () => false : undefined
    })
];

export const lightBaseExtensions = [
    syntaxHighlighting(lightHighlightStyle),
    lightCSS,
    ...sharedExtensions
];

export const darkBaseExtensions = [
    syntaxHighlighting(darkHighlightStyle),
    darkCSS,
    ...sharedExtensions
];
