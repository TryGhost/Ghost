// we can probably refactor this so that KoenigCaptionEditor can be replaced with this:

import CardContext from '../context/CardContext.jsx';
import React from 'react';
import {COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND} from 'lexical';
import {KoenigComposableEditor, KoenigNestedComposer, MINIMAL_NODES, MINIMAL_TRANSFORMERS, RestrictContentPlugin} from '../index.js';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const Placeholder = ({text = 'Type here'}) => {
    return (
        <div className="pointer-events-none absolute top-0 left-0 m-0 min-w-full cursor-text font-serif text-xl font-normal tracking-wide text-grey-500 ">
            {text}
        </div>
    );
};

// TODO: extract shared behaviour into a `KoenigNestedEditorPlugin` component
function CalloutEditorPlugin({parentEditor}) {
    const [editor] = useLexicalComposerContext();
    const {nodeKey} = React.useContext(CardContext);

    // using state here because this component will get re-rendered after the
    // editor's editable state changes so we need to re-focus on re-render
    const [shouldFocus, setShouldFocus] = React.useState(false);

    React.useEffect(() => {
        if (shouldFocus) {
            editor.focus(() => {
                editor.getRootElement().focus({preventScroll: true});
            });
        }
    }, [shouldFocus, editor]);

    React.useEffect(
        () => {
            return mergeRegister(
                // watch for editor becoming editable rather than relying on an `isEditing` prop
                // because the prop will change before the contenteditable becomes editable, meaning
                // we try to focus a non-editable editor which puts focus on the main editor instead
                editor.registerEditableListener((isEditable) => {
                    if (isEditable) {
                        setShouldFocus(true);
                    } else {
                        setShouldFocus(false);
                    }
                }),
                editor.registerCommand(
                    KEY_ENTER_COMMAND,
                    (event) => {
                        // allow shift+enter to create a line break
                        if (event.shiftKey) {
                            return false;
                        }

                        // otherwise, let the parent editor handle the enter key
                        // - with ctrl/cmd+enter toggles edit mode
                        // - or creates paragraph after card and moves cursor
                        event._fromNested = true;
                        parentEditor.dispatchCommand(KEY_ENTER_COMMAND, event);

                        // prevent normal/KoenigBehaviourPlugin enter key behaviour
                        return true;
                    },
                    COMMAND_PRIORITY_LOW
                )
            );
        },
        [editor, parentEditor, nodeKey]
    );
    return null;
}

const KoenigCalloutEditor = ({
    className,
    nodeKey,
    paragraphs = 1,
    placeholderText,
    textEditor
}) => {
    const [parentEditor] = useLexicalComposerContext();

    return (
        <KoenigNestedComposer
            initialEditor={textEditor}
            initialNodes={MINIMAL_NODES}
        >
            <KoenigComposableEditor
                className={className}
                markdownTransformers={MINIMAL_TRANSFORMERS}
                placeholder={<Placeholder text={placeholderText} />}
            >
                <CalloutEditorPlugin parentEditor={parentEditor} parentNode={nodeKey} />
                <RestrictContentPlugin paragraphs={paragraphs} />
            </KoenigComposableEditor>
        </KoenigNestedComposer>
    );
};

export default KoenigCalloutEditor;
