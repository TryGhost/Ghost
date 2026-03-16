import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import type {DragDropHandler} from '../utils/draggable/DragDropHandler';
import type {DraggableInfo, DraggableInfoSeed} from '../utils/draggable/ScrollHandler';
import type {IndicatorPosition} from '../utils/draggable/DragDropContainer';

interface UseCardDragAndDropOptions {
    enabled?: boolean;
    canDrop: (draggableInfo: DraggableInfo) => boolean;
    onDrop?: (draggableInfo: DraggableInfo) => boolean | void;
    onDropEnd?: (draggableInfo: DraggableInfo, success: boolean) => void;
    getDraggableInfo?: (draggableElement: HTMLElement) => DraggableInfoSeed | Record<string, never>;
    getIndicatorPosition?: (draggableInfo: DraggableInfo) => IndicatorPosition | false;
    draggableSelector: string;
    droppableSelector: string;
}

interface DragDropContainerRef {
    enableDrag: () => void;
    disableDrag: () => void;
    refresh: () => void;
    destroy: () => void;
}

export default function useCardDragAndDrop({
    enabled = true,
    canDrop,
    onDrop,
    onDropEnd,
    getDraggableInfo,
    getIndicatorPosition,
    draggableSelector,
    droppableSelector
}: UseCardDragAndDropOptions) {
    const koenig = React.useContext(KoenigComposerContext);

    const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null);
    const [isDraggedOver, setIsDraggedOver] = React.useState(false);
    const dragDropContainer = React.useRef<DragDropContainerRef | null>(null);

    const onDragStart = React.useCallback((draggableInfo: DraggableInfo) => {
        if (canDrop(draggableInfo)) {
            dragDropContainer.current?.enableDrag();
        } else {
            dragDropContainer.current?.disableDrag();
        }
    }, [canDrop]);

    const onDragEnd = React.useCallback(() => {
        setIsDraggedOver(false);
    }, [setIsDraggedOver]);

    const onDragEnterContainer = React.useCallback((draggableInfo: DraggableInfo) => {
        setIsDraggedOver(canDrop(draggableInfo));
    }, [setIsDraggedOver, canDrop]);

    const onDragLeaveContainer = React.useCallback(() => {
        setIsDraggedOver(false);
    }, [setIsDraggedOver]);

    const _onDrop = React.useCallback((draggableInfo: DraggableInfo) => {
        return onDrop?.(draggableInfo) || false;
    }, [onDrop]);

    const _onDropEnd = React.useCallback((draggableInfo: DraggableInfo, success: boolean) => {
        onDropEnd?.(draggableInfo, success);
    }, [onDropEnd]);

    const _getIndicatorPosition = React.useCallback((draggableInfo: DraggableInfo) => {
        return getIndicatorPosition?.(draggableInfo) || false;
    }, [getIndicatorPosition]);

    const _getDraggableInfo = React.useCallback((draggableElement: HTMLElement) => {
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

        dragDropContainer.current = (koenig.dragDropHandler as DragDropHandler).registerContainer(
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
