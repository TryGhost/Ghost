// we can probably refactor this so that KoenigCaptionEditor can be replaced with this:

import CardContext from '../context/CardContext.jsx';
import React, {useCallback, useContext} from 'react';
import {$createParagraphNode, $getNodeByKey, COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND} from 'lexical';
import {HtmlOutputPlugin, KoenigComposableEditor, KoenigComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute top-0 left-0 m-0 min-w-full cursor-text font-serif text-xl font-normal tracking-wide text-grey-500 ">
            {text}
        </div>
    );
};

function CalloutEditorPlugin({parentEditor}) {
    const [editor] = useLexicalComposerContext();
    const {nodeKey} = useContext(CardContext);

    // focus on caption editor when something is typed while card is selected
    const handleKeyDown = useCallback((event) => {
    // don't focus caption input if any other input or textarea is focused
        if (event.target.matches('input, textarea')) {
            return;
        }

        // only trigger on Enter key
        if (event.key === 'Enter') {
            editor.focus();
        }
    }, [editor]);

    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, editor, nodeKey]);

    React.useEffect(
        () => {
            return mergeRegister(
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    (event) => {
                        // if hitting enter while holding shift, don't create a new paragraph
                        if (event.shiftKey) {
                            return false;
                        }
                        parentEditor.update(() => {
                            const cardNode = $getNodeByKey(nodeKey);
                            const paragraphNode = $createParagraphNode();
                            cardNode.getTopLevelElementOrThrow().insertAfter(paragraphNode);
                            paragraphNode.selectStart();
                        });
                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                )
            );
        },
        [editor, parentEditor, nodeKey]
    );
    return null;
}

const KoenigCalloutEditor = ({paragraphs = 1, html, setHtml, placeholderText, readOnly, className, nodeKey}) => {
    const [parentEditor] = useLexicalComposerContext();
    return (
        <KoenigComposer
            nodes={MINIMAL_NODES}
        >
            <KoenigComposableEditor
                className={className}
                markdownTransformers={MINIMAL_TRANSFORMERS}
                placeholder={<Placeholder text={placeholderText} />}
                readOnly={readOnly}
            >
                <CalloutEditorPlugin parentEditor={parentEditor} parentNode={nodeKey} />
                <RestrictContentPlugin paragraphs={paragraphs} />
                <HtmlOutputPlugin html={html} setHtml={setHtml} />
            </KoenigComposableEditor>
        </KoenigComposer>
    );
};

export default KoenigCalloutEditor;
