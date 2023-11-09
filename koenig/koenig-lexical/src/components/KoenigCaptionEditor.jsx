import CardContext from '../context/CardContext.jsx';
import React, {useCallback, useContext} from 'react';
import {BLUR_COMMAND, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW, FOCUS_COMMAND, KEY_ARROW_DOWN_COMMAND, KEY_ARROW_UP_COMMAND, KEY_ENTER_COMMAND} from 'lexical';
import {EmojiPickerPlugin} from '../plugins/EmojiPickerPlugin.jsx';
import {KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute left-0 top-0 !m-0 min-w-full cursor-text font-sans text-sm font-normal leading-[24px] tracking-wide text-grey-500 dark:text-grey-800">
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
                        return false;
                    },
                    COMMAND_PRIORITY_LOW
                ),
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    (event) => {
                        // TODO: find a more elegant way to handle this
                        // intercept enter commands when interacting with the typeahead menu (same command priority)
                        if (document.querySelector(`#typeahead-menu`)) {
                            return false;
                        }
                        
                        // allow shift+enter to create a line break
                        if (event.shiftKey) {
                            return false;
                        }

                        // otherwise, let the parent editor handle the enter key
                        // - with ctrl/cmd+enter toggles edit mode
                        // - or creates paragraph after card and moves cursor
                        event._fromNested = true;
                        editor._parentEditor.dispatchCommand(KEY_ENTER_COMMAND, event);

                        // prevent normal/KoenigBehaviourPlugin enter key behaviour
                        return true;
                    },
                    COMMAND_PRIORITY_LOW
                ),
                editor.registerCommand(
                    KEY_ARROW_DOWN_COMMAND,
                    (event) => {
                        // TODO: wait for new lexical version, see https://github.com/facebook/lexical/commit/df2a50bc88e0778af26e109502cfcfb9cbe245d5
                        if (document.querySelector(`#typeahead-menu`)) {
                            return false;
                        }
                        // handle moving focus at the parent editor level (select next card)
                        event._fromCaptionEditor = true;
                        editor._parentEditor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event);
                        return true;
                    },
                    COMMAND_PRIORITY_HIGH
                ),
                editor.registerCommand(
                    KEY_ARROW_UP_COMMAND,
                    (event) => {
                        // TODO: wait for new lexical version, see https://github.com/facebook/lexical/commit/df2a50bc88e0778af26e109502cfcfb9cbe245d5
                        if (document.querySelector(`#typeahead-menu`)) {
                            return false;
                        }
                        // handle moving focus at the parent editor level (select next card)
                        event._fromCaptionEditor = true;
                        editor._parentEditor.dispatchCommand(KEY_ARROW_UP_COMMAND, event);
                        return true;
                    },
                    COMMAND_PRIORITY_HIGH
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
                <EmojiPickerPlugin />
            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigCaptionEditor;
