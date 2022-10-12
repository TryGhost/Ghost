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

    function getTopPosition(elem) {
        const elemRect = elem.getBoundingClientRect();
        const containerRect = elem.parentNode.getBoundingClientRect();

        return elemRect.top - containerRect.top;
    }

    const updateButton = React.useCallback(() => {
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
            const rootElement = editor.getRootElement();

            if (p?.tagName !== 'P' || !rootElement.contains(p)) {
                setShowButton(false);
                return;
            }

            setTopPosition(getTopPosition(p));
            setShowButton(true);
        });
    }, [editor, setShowButton]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateButton();
        }, [editor, updateButton]);
    });

    // hide the button as soon as there's any selection made outside of the
    // editor canvas - any click outside makes a selection so no need for
    // additional mouse tracking for this
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

    // show or move the button when the mouse moves over a blank paragraph
    const updateButtonOnMousemove = React.useCallback((event) => {
        // do not show the button if we're dragging a selection
        if (event.buttons !== 0) {
            setShowButton(false);
            return;
        }

        const rootElement = editor.getRootElement();
        let {pageX, pageY} = event;

        // add a horizontal buffer to the pointer position so that the button
        // doesn't disappear when moving across the gap between button and paragraph
        let containerRect = rootElement.getBoundingClientRect();
        if (pageX < containerRect.left) {
            pageX = pageX + 40;
        }

        // use the page coordinates to find the element under the pointer

        // TODO: this basic implementation isn't quite as forgiving as the mobiledoc implementation
        //   which appears to have a threshold around the point which creates a bigger hit area for
        //   nearby elements, whereas this removes the button immediately on margin mouseover. See:
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/editor/editor.ts#L1306
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/cursor/position.ts#L115
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/selection-utils.ts#L39-L90
        const hoveredElem = document.elementFromPoint(pageX, pageY);

        if (rootElement.contains(hoveredElem)) {
            if (hoveredElem?.tagName === 'P' && hoveredElem.textContent === '') {
                // place cursor next to the hovered paragraph
                setTopPosition(getTopPosition(hoveredElem));
                setShowButton(true);
            } else {
                // reset cursor based on caret position
                updateButton();
            }
        }
    }, [editor, setTopPosition, setShowButton, updateButton]);

    React.useEffect(() => {
        window.addEventListener('mousemove', updateButtonOnMousemove);
        return () => {
            window.removeEventListener('mousemove', updateButtonOnMousemove);
        };
    }, [updateButtonOnMousemove]);

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
