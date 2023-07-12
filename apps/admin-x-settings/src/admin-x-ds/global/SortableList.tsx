import Icon from './Icon';
import React, {HTMLProps, ReactNode, useState} from 'react';
import clsx from 'clsx';
import {CSS} from '@dnd-kit/utilities';
import {DndContext, DragOverlay, DraggableAttributes, closestCenter} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';

export interface SortableItemContainerProps {
    setRef?: (element: HTMLElement | null) => void;
    isDragging: boolean;
    dragHandleAttributes?: DraggableAttributes;
    dragHandleListeners?: Record<string, Function>;
    style?: React.CSSProperties;
    children: ReactNode
}

const DefaultContainer: React.FC<SortableItemContainerProps> = ({setRef, isDragging, dragHandleAttributes, dragHandleListeners, style, children}) => (
    <div
        ref={setRef}
        className={clsx(
            'flex w-full items-start gap-3 rounded border-b border-grey-200 bg-white py-4 hover:bg-grey-100',
            isDragging && 'opacity-75'
        )}
        style={style}
    >
        <button
            className={clsx(
                'ml-2 h-7 pl-2',
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
            type='button'
            {...dragHandleAttributes}
            {...dragHandleListeners}
        >
            <Icon colorClass='text-grey-500' name='hamburger' size='sm' />
        </button>
        {children}
    </div>
);

const SortableItem: React.FC<{
    id: string
    children: ReactNode;
    container: (props: SortableItemContainerProps) => ReactNode;
}> = ({id, children, container}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return container({
        setRef: setNodeRef,
        isDragging: false,
        dragHandleAttributes: attributes,
        dragHandleListeners: listeners,
        style,
        children
    });
};

export interface SortableListProps<Item extends {id: string}> extends HTMLProps<HTMLDivElement> {
        items: Item[];
        onMove: (id: string, overId: string) => void;
        renderItem: (item: Item) => ReactNode;
        container?: (props: SortableItemContainerProps) => ReactNode;
}

/**
 * Note: For lists which don't have an ID, you can use `useSortableIndexedList` to give items a consistent index-based ID.
 */
const SortableList = <Item extends {id: string}>({
    items,
    onMove,
    renderItem,
    container = props => <DefaultContainer {...props} />,
    ...props
}: SortableListProps<Item>) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);

    return (
        <div {...props}>
            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={event => onMove(event.active.id as string, event.over?.id as string)}
                onDragStart={event => setDraggingId(event.active.id as string)}
            >
                <SortableContext
                    items={items}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map(item => (
                        <SortableItem key={item.id} container={container} id={item.id}>{renderItem(item)}</SortableItem>
                    ))}
                </SortableContext>
                <DragOverlay>
                    {draggingId ? container({
                        isDragging: true,
                        children: renderItem(items.find(({id}) => id === draggingId)!)
                    }) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default SortableList;
