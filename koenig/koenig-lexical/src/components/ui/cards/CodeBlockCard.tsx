import CodeMirror from '@uiw/react-codemirror';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {css} from '@codemirror/lang-css';
import {darkBaseExtensions, lightBaseExtensions} from '../../../utils/codemirror-config';
import {html} from '@codemirror/lang-html';
import {javascript} from '@codemirror/lang-javascript';

const languageMap = new Map([
    ['javascript', javascript],
    ['js', javascript],
    ['html', html],
    ['css', css]
]);

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

    const extensions = React.useMemo(() => {
        const base = darkMode ? darkBaseExtensions : lightBaseExtensions;
        const highlighter = languageMap.get(language?.toLowerCase().trim());
        return highlighter ? [...base, highlighter()] : base;
    }, [darkMode, language]);

    return (
        <div className="not-kg-prose min-h-[170px]">
            <CodeMirror
                autoFocus={true}
                basicSetup={false}
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
