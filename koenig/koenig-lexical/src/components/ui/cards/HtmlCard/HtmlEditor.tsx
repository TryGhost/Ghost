import CodeMirror from '@uiw/react-codemirror';
import React from 'react';
import {closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete';
import {darkBaseExtensions, lightBaseExtensions} from '../../../../utils/codemirror-config';
import {keymap} from '@codemirror/view';
import {html as langHtml} from '@codemirror/lang-html';

const htmlExtras = [
    keymap.of(closeBracketsKeymap),
    langHtml(),
    closeBrackets()
];

const lightExtensions = [...lightBaseExtensions, ...htmlExtras];
const darkExtensions = [...darkBaseExtensions, ...htmlExtras];

export default function HtmlEditor({darkMode, html, updateHtml}) {
    const onChange = React.useCallback((value) => {
        updateHtml(value);
    }, [updateHtml]);

    const extensions = darkMode ? darkExtensions : lightExtensions;

    return (
        <div className="not-kg-prose min-h-[170px]">
            <CodeMirror
                autoFocus={true}
                basicSetup={false}
                extensions={extensions}
                value={html}
                onChange={onChange}
            />
        </div>
    );
}
