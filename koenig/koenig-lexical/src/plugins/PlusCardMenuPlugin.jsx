import React from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ReactComponent as PlusIcon} from '../assets/icons/plus.svg';
import {$getSelection, $isParagraphNode, $isRangeSelection} from 'lexical';
import {getSelectedNode} from '../utils/getSelectedNode';

function PlusButton({topPosition}) {
    const style = {
        top: `${topPosition - 2}px`,
        left: '-66px'
    };

    return (
        <div className="absolute" style={style} data-kg-plus-button>
            <button
                type="button"
                aria-label="Add a card"
                className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-grey bg-white transition-all ease-linear hover:border-grey-900 md:h-9 md:w-9"
            >
                <PlusIcon className="h-4 w-4 stroke-grey-800 stroke-2 group-hover:stroke-grey-900" />
            </button>
        </div>
    );
}

function usePlusCardMenu(editor) {
    const [showButton, setShowButton] = React.useState(false);
    const [topPosition, setTopPosition] = React.useState(0);

    const updateButton = React.useCallback(() => {
        function getTopPosition(elem) {
            const elemRect = elem.getBoundingClientRect();
            const containerRect = elem.parentNode.getBoundingClientRect();

            return elemRect.top - containerRect.top;
        }

        editor.getEditorState().read(() => {
            // don't do anything when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();

            if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                setShowButton(false);
                return;
            }

            const node = getSelectedNode(selection);

            if (!$isParagraphNode(node) || node.getTextContent() !== '') {
                setShowButton(false);
                return;
            }

            const nativeSelection = window.getSelection();
            const p = nativeSelection.anchorNode;

            setShowButton(true);
            setTopPosition(getTopPosition(p));
        });
    }, [editor, setShowButton]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateButton();
        }, [editor, updateButton]);
    });

    const hideButtonOnOutsideSelection = React.useCallback(() => {
        if (showButton) {
            const nativeSelection = window.getSelection();
            const rootElement = editor.getRootElement();

            if (!rootElement.contains(nativeSelection.anchorNode)) {
                setShowButton(false);
            }
        }
    }, [editor, showButton, setShowButton]);

    React.useEffect(() => {
        document.addEventListener('selectionchange', hideButtonOnOutsideSelection);
        return () => {
            document.removeEventListener('selectionchange', hideButtonOnOutsideSelection);
        };
    }, [hideButtonOnOutsideSelection]);

    return (
        <>
            {showButton && <PlusButton topPosition={topPosition} />}
        </>
    );
}

export default function PlusCardMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    return usePlusCardMenu(editor);
}
