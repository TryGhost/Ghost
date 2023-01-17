import React from 'react';
import PropTypes from 'prop-types';
import CodeMirror from '@uiw/react-codemirror';
import {EditorView} from '@codemirror/view';

export function CodeEditor({code, language, updateCode, updateLanguage}) {
    const onChange = React.useCallback((value) => {
        updateCode(value);
    }, [updateCode]);

    const editorCSS = EditorView.theme({
        '.cm-content, .cm-gutter': {
            minHeight: '170px'
        },
        '.cm-scroller': {
            overflow: 'auto'
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
                className="z-999 absolute top-1.5 right-1.5 w-20"
            />
        </div>
    );
}

export function CodeBlock({code}) {
    return (
        <pre>
            <code>
                {code}
            </code>
        </pre>
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
            <CodeBlock code={code} />
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