import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';

export default function useCardDragAndDrop({
    enabled = true,
    canDrop,
    onDrop,
    onDropEnd,
    getDraggableInfo,
    getIndicatorPosition,
    draggableSelector,
    droppableSelector
}) {
    const koenig = React.useContext(KoenigComposerContext);

    const [containerRef, setContainerRef] = React.useState(null);
    const [isDraggedOver, setIsDraggedOver] = React.useState(false);
    const dragDropContainer = React.useRef(null);

    const onDragStart = React.useCallback((draggableInfo) => {
        if (canDrop(draggableInfo)) {
            dragDropContainer.current.enableDrag();
        } else {
            dragDropContainer.current.disableDrag();
        }
    }, [canDrop]);

    const onDragEnd = React.useCallback(() => {
        setIsDraggedOver(false);
    }, [setIsDraggedOver]);

    const onDragEnterContainer = React.useCallback((draggableInfo) => {
        setIsDraggedOver(canDrop(draggableInfo));
    }, [setIsDraggedOver, canDrop]);

    const onDragLeaveContainer = React.useCallback(() => {
        setIsDraggedOver(false);
    }, [setIsDraggedOver]);

    const _onDrop = React.useCallback((draggableInfo) => {
        return onDrop?.(draggableInfo) || false;
    }, [onDrop]);

    const _onDropEnd = React.useCallback((draggableInfo, success) => {
        onDropEnd?.(draggableInfo, success);
    }, [onDropEnd]);

    // returns {
    //   direction: 'horizontal' TODO: use a constant?
    //   position: 'left'/'right' TODO: use constants?
    //   beforeElems: array of elems to left of indicator
    //   afterElems: array of elems to right of indicator
    //   droppableIndex:
    // }
    const _getIndicatorPosition = React.useCallback((draggableInfo) => {
        return getIndicatorPosition?.(draggableInfo) || false;
    }, [getIndicatorPosition]);

    const _getDraggableInfo = React.useCallback((draggableElement) => {
        return getDraggableInfo?.(draggableElement) || {};
    }, [getDraggableInfo]);

    React.useEffect(() => {
        if (enabled) {
            dragDropContainer.current?.enableDrag();
        } else {
            dragDropContainer.current?.disableDrag();
        }
    }, [enabled, containerRef]);

    React.useEffect(() => {
        if (!containerRef || !koenig.dragDropHandler) {
            return;
        }

        dragDropContainer.current = koenig.dragDropHandler.registerContainer(
            containerRef,
            {
                draggableSelector,
                droppableSelector,
                isDragEnabled: enabled,
                onDragStart,
                onDragEnd,
                onDragEnterContainer,
                onDragLeaveContainer,
                getDraggableInfo: _getDraggableInfo,
                getIndicatorPosition: _getIndicatorPosition,
                onDrop: _onDrop,
                onDropEnd: _onDropEnd
            }
        );
    }, [
        _getDraggableInfo,
        _getIndicatorPosition,
        _onDrop,
        _onDropEnd,
        containerRef,
        draggableSelector,
        droppableSelector,
        enabled,
        koenig.dragDropHandler,
        onDragEnd,
        onDragEnterContainer,
        onDragLeaveContainer,
        onDragStart
    ]);

    return {setRef: setContainerRef, isDraggedOver};
}
