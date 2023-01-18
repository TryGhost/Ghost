import React from 'react';
import PropTypes from 'prop-types';
import CodeMirror from '@uiw/react-codemirror';
import {EditorView} from '@codemirror/view';

export function CodeEditor({code, language, updateCode, updateLanguage}) {
    const onChange = React.useCallback((value) => {
        updateCode(value);
    }, [updateCode]);

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
            color: '#CED4D9'
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

    return (
        <div>
            <CodeMirror
                value={code}
                extensions={[editorCSS]}
                onChange={onChange}
            />
            <input
                aria-label="Code card language"
                type="text"
                value={language}
                onBlur={updateLanguage}
                placeholder="Language..."
                className="z-999 absolute top-1.5 right-1.5 w-1/5 rounded border border-grey-300 p-1 font-sans text-[1.3rem] leading-4 text-grey-900 focus-visible:outline-none"
            />
        </div>
    );
}

export function CodeBlock({code, language}) {
    return (
        <div>
            <pre className="h-[max-content] rounded border border-grey-200 bg-grey-100 px-2 py-[2px]">
                <code className="font-mono text-[1.6rem] leading-9 text-grey-900">
                    {code}
                </code>
            </pre>
            <div className="pa2 absolute top-2 right-2 flex items-center justify-center">
                <span className="db nudge-top--2 fw5 f8 midlightgrey">{language}</span>
            </div>
        </div>
        
    );
}

export function CodeBlockCard({code, isEditing, isSelected, language, updateCode, updateLanguage}) {
    if (isEditing) {
        return (
            <CodeEditor 
                code={code}
                language={language}
                updateLanugage={updateLanguage}
                updateCode={updateCode}
            />
        );
    } else {
        return (
            <CodeBlock code={code} language={language} />
        );
    }
}

CodeBlock.propTypes = {
    code: PropTypes.string
};

CodeBlockCard.propTypes = {
    code: PropTypes.string,
    isEditing: PropTypes.bool,
    isSelected: PropTypes.bool,
    language: PropTypes.string
};