// we can probably refactor this so that KoenigCaptionEditor can be replaced with this:

import CardContext from '../context/CardContext.jsx';
import React, {useCallback, useContext} from 'react';
import {$createParagraphNode, $getNodeByKey, $setSelection, COMMAND_PRIORITY_LOW, FOCUS_COMMAND, KEY_ENTER_COMMAND} from 'lexical';
import {HtmlOutputPlugin, KoenigComposableEditor, KoenigComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute top-0 left-0 m-0 min-w-full cursor-text font-sans text-xl font-normal tracking-wide text-grey-500 ">
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
    
        // only if key is printable key, focus on editor
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            editor.focus();
        }
    }, [editor]);

    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, editor]);

    React.useEffect(
        () => {
            return mergeRegister(
                editor.registerCommand(
                    FOCUS_COMMAND,
                    () => {
                        // focus on the parent node key
                        parentEditor.update(() => {
                            const cardNode = $getNodeByKey(nodeKey);
                            $setSelection(cardNode);
                        });

                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                ),
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
