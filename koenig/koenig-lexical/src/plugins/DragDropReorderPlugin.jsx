import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$createImageNode} from '../nodes/ImageNode.jsx';
import {$createNodeSelection, $getNearestNodeFromDOMNode, $getNodeByKey, $setSelection} from 'lexical';
import {DragDropHandler} from '../utils/draggable/DragDropHandler.jsx';
import {isCardDropAllowed} from '../utils/draggable/draggable-utils.js';
import {renderToString} from 'react-dom/server';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function preventDefault(event) {
    event.preventDefault();
}

function useDragDropReorder(editor, isEditable) {
    const koenig = React.useContext(KoenigComposerContext);
    const {setIsDragging} = useKoenigSelectedCardContext();

    const cardContainer = React.useRef(null);
    const skipOnDropEnd = React.useRef(false);

    // useRef because we need stable function references to pass into the drag drop container instance
    const onDragStart = React.useRef(() => {
        cardContainer.current.refresh();
        setIsDragging(true);
    });

    const onDragEnd = React.useRef(() => {
        setIsDragging(false);
    });

    const getDraggableInfo = React.useRef((draggableElement) => {
        let draggableInfo;

        editor.update(() => {
            const cardNode = $getNearestNodeFromDOMNode(draggableElement);

            if (cardNode) {
                // TODO: payload should probably contain everything here as well as the
                // card payload so that draggableInfo has a consistent shape
                draggableInfo = {
                    type: 'card',
                    nodeKey: cardNode.getKey(),
                    cardName: cardNode.getType(),
                    dataset: cardNode.getDataset?.(),
                    Icon: cardNode.getIcon()
                };
            }
        });

        return draggableInfo || false;
    });

    const createCardDragElement = React.useRef((draggableInfo) => {
        const {cardName, Icon} = draggableInfo;

        if (!cardName || cardName === 'image') {
            return;
        }

        const style = {
            top: '0',
            left: '-100%',
            zIndex: 10001,
            willChange: 'transform'
        };

        const GhostElement = () => {
            return (
                <div className="absolute flex h-16 w-16 flex-col items-center justify-center rounded bg-white shadow-sm" style={style}>
                    <div className="flex items-center">
                        <Icon className="h-8 w-8" />
                    </div>
                </div>
            );
        };

        const wrapper = document.createElement('div');
        // uses "server-side" renderToString here because we need a real DOM element
        // synchronously which client-side ReactDOM can't give us
        wrapper.innerHTML = renderToString(<GhostElement />);

        return wrapper.firstChild;
    });

    const getDropIndicatorPosition = React.useRef((draggableInfo, droppableElem, position) => {
        const droppables = Array.from(editor.getRootElement().querySelectorAll(':scope > *'));
        const droppableIndex = droppables.indexOf(droppableElem);
        const draggableIndex = droppables.indexOf(draggableInfo.element);

        // only allow card and image drops (images can be dragged out of a gallery)
        if (draggableInfo.type !== 'card' && draggableInfo.type !== 'image') {
            return false;
        }

        if (isCardDropAllowed(draggableIndex, droppableIndex, position)) {
            let insertIndex = droppableIndex;
            if (position.match(/bottom/)) {
                insertIndex += 1;
            }

            let beforeElems, afterElems;
            if (position.match(/bottom/)) {
                beforeElems = droppables.slice(0, droppableIndex + 1);
                afterElems = droppables.slice(droppableIndex + 1);
            } else {
                beforeElems = droppables.slice(0, droppableIndex);
                afterElems = droppables.slice(droppableIndex);
            }

            return {
                direction: 'vertical',
                position: position.match(/top/) ? 'top' : 'bottom',
                beforeElems,
                afterElems,
                insertIndex: insertIndex
            };
        }

        return false;
    });

    const onCardDrop = React.useRef((draggableInfo) => {
        if (draggableInfo.type !== 'card' && draggableInfo.type !== 'image') {
            return false;
        }

        const droppables = Array.from(editor.getRootElement().querySelectorAll(':scope > *'));
        const draggableIndex = droppables.indexOf(draggableInfo.element);

        if (isCardDropAllowed(draggableIndex, draggableInfo.insertIndex)) {
            let returnValue;

            editor.update(() => {
                // change card order on card drops
                if (draggableInfo.type === 'card') {
                    const draggedNode = $getNodeByKey(draggableInfo.nodeKey);

                    if (draggableInfo.insertIndex >= droppables.length) {
                        // drop at end of document
                        const targetNode = $getNearestNodeFromDOMNode(droppables[droppables.length - 1]);
                        targetNode.insertAfter(draggedNode);
                    } else {
                        const targetNode = $getNearestNodeFromDOMNode(droppables[draggableInfo.insertIndex]);
                        targetNode.insertBefore(draggedNode);
                    }

                    // clear selection so we don't show any toolbars immediately and the
                    // cursor isn't left stranded somewhere else in the document
                    $setSelection(null);

                    // skip card removal as we're not moving a card inside another card
                    skipOnDropEnd.current = true;

                    returnValue = true;
                    return;
                }

                // insert new image node on image drops
                if (draggableInfo.type === 'image') {
                    const targetNode = $getNearestNodeFromDOMNode(droppables[draggableInfo.insertIndex]);
                    const imageNode = $createImageNode(draggableInfo.dataset);
                    targetNode.insertBefore(imageNode);

                    // select the newly inserted image card
                    const nodeSelection = $createNodeSelection();
                    nodeSelection.add(imageNode.getKey());
                    $setSelection(nodeSelection);

                    returnValue = true;
                    return;
                }
            });

            return returnValue;
        }
    });

    // a card can be dropped into another card which means we need to remove the original
    const onDropEnd = React.useRef((draggableInfo, success) => {
        // avoid removing the card if it's just a re-order or no move occurred
        if (skipOnDropEnd.current || !success || draggableInfo.type !== 'card') {
            skipOnDropEnd.current = false;
            return;
        }

        editor.update(() => {
            const cardNode = $getNodeByKey(draggableInfo.nodeKey);
            cardNode.remove(false);
        });
    });

    React.useEffect(() => {
        koenig.dragDropHandler = new DragDropHandler({
            editorContainerElement: koenig.editorContainerRef.current
        });

        cardContainer.current = koenig.dragDropHandler.registerContainer(editor.getRootElement(), {
            draggableSelector: ':scope > div', // cards
            droppableSelector: ':scope > *', // all block elements
            onDragStart: onDragStart.current,
            onDragEnd: onDragEnd.current,
            getDraggableInfo: getDraggableInfo.current,
            createGhostElement: createCardDragElement.current,
            getIndicatorPosition: getDropIndicatorPosition.current,
            onDrop: onCardDrop.current,
            onDropEnd: onDropEnd.current
        });

        return () => {
            cardContainer.current = null;
            koenig.dragDropHandler?.destroy();
            delete koenig.dragDropHandler;
        };
    }, [editor, koenig]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            // refresh drag/drop
            // TODO: can be made more performant by only refreshing when droppable
            // order changes or when sections are added/removed
            cardContainer.current?.refresh();
        });
    }, [editor]);

    // disable normal drag start events so they don't interfere with our custom drag handling
    React.useEffect(() => {
        return editor.registerRootListener((rootElement, prevRootElement) => {
            rootElement?.addEventListener('dragstart', preventDefault);
            prevRootElement?.removeEventListener('dragstart', preventDefault);
        });
    }, [editor]);
}

export default function DragDropReorderPlugin() {
    const [editor] = useLexicalComposerContext();
    return useDragDropReorder(editor, editor._editable);
}
