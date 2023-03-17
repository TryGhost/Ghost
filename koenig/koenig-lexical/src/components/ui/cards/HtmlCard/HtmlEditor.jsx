import CodeMirror from '@uiw/react-codemirror';
import React from 'react';
import {githubDark, githubLight} from '@uiw/codemirror-theme-github';
import {keymap, lineNumbers} from '@codemirror/view';
import {html as langHtml} from '@codemirror/lang-html';
import {minimalSetup} from '@uiw/codemirror-extensions-basic-setup';
import {standardKeymap} from '@codemirror/commands';

export default function HtmlEditor({darkMode, html, updateHtml}) {
    const onChange = React.useCallback((value) => {
        updateHtml(value);
    }, [updateHtml]);

    // Base extensions for the CodeMirror editor
    const extensions = [
        lineNumbers(), // adds line numbers to the gutter
        minimalSetup({defaultKeymap: false}), // disable defaultKeymap to prevent Mod+Enter from inserting new line
        keymap.of(standardKeymap), // add back in standardKeymap, which doesn't include Mod+Enter
        langHtml()
    ];

    return (
        <div className="not-kg-prose min-h-[170px] bg-[#F4F5F6]">
            <CodeMirror
                autoFocus={true} // autofocus the editor whenever it is rendered
                basicSetup={false} // basic setup includes unnecessary extensions
                extensions={extensions}
                theme={darkMode ? githubDark : githubLight}
                value={html}
                onChange={onChange}
            />
        </div>
    );
}