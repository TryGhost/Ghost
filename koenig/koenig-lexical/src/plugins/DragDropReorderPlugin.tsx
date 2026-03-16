import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createImageNode} from '../nodes/ImageNode';
import {$createNodeSelection, $getNearestNodeFromDOMNode, $getNodeByKey, $setSelection} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {DragDropHandler} from '../utils/draggable/DragDropHandler';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {isCardDropAllowed} from '../utils/draggable/draggable-utils';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import type {DraggableInfo} from '../utils/draggable/ScrollHandler';
import type {LexicalEditor} from 'lexical';

interface DragDropContainer {
    refresh(): void;
    disableDrag(): void;
    enableDrag(): void;
}

function preventDefault(event: Event) {
    event.preventDefault();
}

function useDragDropReorder(editor: LexicalEditor, _isEditable: boolean) {
    const koenig = React.useContext(KoenigComposerContext);
    const {setIsDragging, isEditingCard} = useKoenigSelectedCardContext();

    const cardContainer = React.useRef<DragDropContainer | null>(null);
    const skipOnDropEnd = React.useRef(false);

    // useRef because we need stable function references to pass into the drag drop container instance
    const onDragStart = React.useRef(() => {
        cardContainer.current?.refresh();
        setIsDragging(true);
    });

    const onDragEnd = React.useRef(() => {
        setIsDragging(false);
    });

    const getDraggableInfo = React.useRef((draggableElement: HTMLElement) => {
        let draggableInfo;

        editor.update(() => {
            const cardNode = $getNearestNodeFromDOMNode(draggableElement);

            if ($isKoenigCard(cardNode)) {
                const getIcon = cardNode.getIcon;
                draggableInfo = {
                    type: 'card',
                    nodeKey: cardNode.getKey(),
                    cardName: cardNode.getType(),
                    dataset: cardNode.getDataset(),
                    Icon: typeof getIcon === 'function' ? getIcon.call(cardNode) : undefined
                };
            }
        });

        return draggableInfo || false;
    });


    const createCardDragElement = React.useRef((draggableInfo: DraggableInfo) => {
        const {cardName, Icon} = draggableInfo;

        if (!cardName || cardName === 'image' || !Icon) {
            return;
        }

        const style = {
            top: '0',
            left: '-100%',
            zIndex: 10001,
            willChange: 'transform'
        };

        const ghost = document.createElement('div');
        // classes kept so Tailwind picks up usage
        ghost.className = 'absolute flex size-16 flex-col items-center justify-center rounded bg-white shadow-sm';
        Object.assign(ghost.style, style);

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'flex items-center';
        ghost.appendChild(iconWrapper);

        // Icon is a React component — render synchronously via flushSync
        const iconRoot = document.createElement('div');
        iconWrapper.appendChild(iconRoot);
        const reactRoot = createRoot(iconRoot);
        flushSync(() => {
            reactRoot.render(<Icon className="size-8" />);
        });

        // Store the React root so DragDropHandler can unmount it on cleanup
        (ghost as HTMLElement & {__reactRoot?: ReturnType<typeof createRoot>}).__reactRoot = reactRoot;

        return ghost;
    });

    const getDropIndicatorPosition = React.useRef((draggableInfo: DraggableInfo, droppableElem: Element, position: string) => {
        const droppables = Array.from(editor.getRootElement()?.querySelectorAll<HTMLElement>(':scope > *') ?? []);
        const droppableIndex = droppables.indexOf(droppableElem as HTMLElement);
        const draggableIndex = draggableInfo.element ? droppables.indexOf(draggableInfo.element) : -1;

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
                direction: 'vertical' as const,
                position: position.match(/top/) ? 'top' : 'bottom',
                beforeElems,
                afterElems,
                insertIndex: insertIndex
            };
        }

        return false;
    });

    const onCardDrop = React.useRef((draggableInfo: DraggableInfo) => {
        if (draggableInfo.type !== 'card' && draggableInfo.type !== 'image') {
            return false;
        }

        const droppables = Array.from(editor.getRootElement()?.querySelectorAll(':scope > *') ?? []);
        const draggableIndex = draggableInfo.element ? droppables.indexOf(draggableInfo.element) : -1;

        if (isCardDropAllowed(draggableIndex, draggableInfo.insertIndex ?? 0)) {
            let returnValue;

            editor.update(() => {
                // change card order on card drops
                if (draggableInfo.type === 'card') {
                    const draggedNode = $getNodeByKey(draggableInfo.nodeKey as string);
                    if (!draggedNode) {
                        return;
                    }

                    if ((draggableInfo.insertIndex ?? 0) >= droppables.length) {
                        // drop at end of document
                        const targetNode = $getNearestNodeFromDOMNode(droppables[droppables.length - 1] as Node);
                        targetNode?.insertAfter(draggedNode);
                    } else {
                        const targetNode = $getNearestNodeFromDOMNode(droppables[draggableInfo.insertIndex ?? 0] as Node);
                        targetNode?.insertBefore(draggedNode);
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
                    const targetNode = $getNearestNodeFromDOMNode(droppables[draggableInfo.insertIndex ?? 0] as Node);
                    const imageNode = $createImageNode((draggableInfo.dataset as Record<string, unknown>) ?? {});
                    targetNode?.insertBefore(imageNode);

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
    const onDropEnd = React.useRef((draggableInfo: DraggableInfo, success: boolean) => {
        // avoid removing the card if it's just a re-order or no move occurred
        if (skipOnDropEnd.current || !success || draggableInfo.type !== 'card') {
            skipOnDropEnd.current = false;
            return;
        }

        editor.update(() => {
            if (!draggableInfo.nodeKey) {
                return;
            }
            const cardNode = $getNodeByKey(draggableInfo.nodeKey);
            cardNode?.remove(false);
        });
    });

    React.useEffect(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) {
            return;
        }

        koenig.dragDropHandler = new DragDropHandler({
            editorContainerElement: koenig.editorContainerRef.current
        });

        cardContainer.current = (koenig.dragDropHandler as DragDropHandler).registerContainer(rootElement, {
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
            (koenig.dragDropHandler as DragDropHandler)?.destroy();
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
        return editor.registerRootListener((rootElement: HTMLElement | null, prevRootElement: HTMLElement | null) => {
            rootElement?.addEventListener('dragstart', preventDefault);
            prevRootElement?.removeEventListener('dragstart', preventDefault);
        });
    }, [editor]);

    // Disable drag-drop-reorder when editing a card
    React.useEffect(() => {
        if (isEditingCard) {
            cardContainer.current?.disableDrag();
        } else {
            cardContainer.current?.enableDrag();
        }
    }, [isEditingCard]);
}

export default function DragDropReorderPlugin() {
    const [editor] = useLexicalComposerContext();
    useDragDropReorder(editor, editor._editable);
    return null;
}
