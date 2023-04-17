import CardContext from '../context/CardContext.jsx';
import React, {useCallback, useContext} from 'react';
import {$createParagraphNode, $getNodeByKey, $setSelection, BLUR_COMMAND, COMMAND_PRIORITY_LOW, FOCUS_COMMAND, KEY_ENTER_COMMAND} from 'lexical';
import {KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute top-0 left-0 m-0 min-w-full cursor-text font-sans text-sm font-normal tracking-wide text-grey-500 dark:text-grey-800">
            {text}
        </div>
    );
};

function CaptionPlugin({parentEditor}) {
    const [editor] = useLexicalComposerContext();
    const {setCaptionHasFocus, captionHasFocus, nodeKey, isSelected} = useContext(CardContext);

    // focus on caption editor when something is typed while card is selected
    const handleKeyDown = useCallback((event) => {
        // don't focus caption input if card is not selected
        if (!isSelected) {
            return;
        }

        // don't focus caption input if any other input or textarea is focused
        if (event.target.matches('input, textarea')) {
            return;
        }

        // only if key is printable key, focus on editor
        if (!captionHasFocus && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            editor.focus();
        }
    }, [editor, captionHasFocus, isSelected]);

    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, editor]);

    // handle focus/blur and enter key commands
    React.useEffect(
        () => {
            return mergeRegister(
                editor.registerCommand(
                    FOCUS_COMMAND,
                    () => {
                        setCaptionHasFocus(true);
                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                ),
                editor.registerCommand(
                    BLUR_COMMAND,
                    () => {
                        setCaptionHasFocus(false);
                        editor.update(() => {
                            $setSelection(null);
                        });
                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                ),
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    () => {
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
        [editor, setCaptionHasFocus, parentEditor, nodeKey]
    );

    return null;
}

const KoenigCaptionEditor = ({paragraphs = 1, captionEditor, captionEditorInitialState, placeholderText, className = 'koenig-lexical-caption'}) => {
    const [parentEditor] = useLexicalComposerContext();
    return (
        <KoenigNestedComposer
            initialEditor={captionEditor}
            initialEditorState={captionEditorInitialState}
            initialNodes={MINIMAL_NODES}
        >
            <KoenigComposableEditor
                className={className}
                markdownTransformers={MINIMAL_TRANSFORMERS}
                placeholder={<Placeholder text={placeholderText} />}
            >
                <CaptionPlugin parentEditor={parentEditor} />
                <RestrictContentPlugin paragraphs={paragraphs} />
            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigCaptionEditor;
