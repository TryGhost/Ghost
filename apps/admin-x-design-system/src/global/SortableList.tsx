import {DndContext, DragOverlay, DraggableAttributes, closestCenter} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import clsx from 'clsx';
import React, {ElementType, HTMLProps, ReactNode, useState} from 'react';
import Heading from './Heading';
import Hint from './Hint';
import Icon from './Icon';
import Separator from './Separator';

export interface SortableItemContainerProps {
    id: string;
    setRef?: (element: HTMLElement | null) => void;
    isDragging: boolean;
    dragHandleAttributes?: DraggableAttributes;
    // TODO: figure out a stricter alternative for Function
    // eslint-disable-next-line @typescript-eslint/ban-types
    dragHandleListeners?: Record<string, Function>;
    dragHandleClass?: string;
    style?: React.CSSProperties;
    children: ReactNode;
    separator?: boolean;
}

export type DragIndicatorProps = Pick<SortableItemContainerProps, 'isDragging' | 'dragHandleAttributes' | 'dragHandleListeners' | 'dragHandleClass'> & React.HTMLAttributes<HTMLButtonElement>

export const DragIndicator: React.FC<DragIndicatorProps> = ({isDragging, dragHandleAttributes, dragHandleListeners, dragHandleClass, className, ...props}) => (
    <button
        className={clsx(
            'opacity-50 group-hover:opacity-100',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            dragHandleClass,
            className
        )}
        type='button'
        {...dragHandleAttributes}
        {...dragHandleListeners}
        {...props}
    >
        <Icon colorClass='text-grey-500' name='hamburger' size='sm' />
    </button>
);

const DefaultContainer: React.FC<SortableItemContainerProps> = ({
    setRef,
    isDragging,
    style,
    separator,
    children,
    ...props
}) => (
    <div
        ref={setRef}
        className={clsx(
            'group flex w-full items-center gap-3 bg-white py-1 dark:bg-black',
            separator && 'border-b border-grey-200',
            isDragging && 'opacity-75'
        )}
        style={style}
    >
        <DragIndicator className='h-7' isDragging={isDragging} {...props} />
        {children}
    </div>
);

const SortableItem: React.FC<{
    id: string
    children: ReactNode;
    separator?: boolean;
    dragHandleClass?: string;
    container: (props: SortableItemContainerProps) => ReactNode;
}> = ({id, children, separator, dragHandleClass, container}) => {
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
        id,
        setRef: setNodeRef,
        isDragging: false,
        separator: separator,
        dragHandleClass: dragHandleClass,
        dragHandleAttributes: attributes,
        dragHandleListeners: listeners,
        style,
        children
    });
};

export interface SortableListProps<Item extends {id: string}> extends HTMLProps<HTMLDivElement> {
    title?: string;
    titleSeparator?: boolean;
    hint?: React.ReactNode;
    items: Item[];
    itemSeparator?: boolean;
    dragHandleClass?: string;
    onMove: (id: string, overId: string) => void;
    renderItem: (item: Item) => ReactNode;
    container?: (props: SortableItemContainerProps) => ReactNode;
    wrapper?: ElementType;
    dragOverlayWrapper?: keyof JSX.IntrinsicElements;
}

/**
 * Note: For lists which don't have an ID, you can use `useSortableIndexedList` to give items a consistent index-based ID.
 */
const SortableList = <Item extends {id: string}>({
    title,
    titleSeparator,
    hint,
    items,
    itemSeparator = true,
    dragHandleClass,
    onMove,
    renderItem,
    container = props => <DefaultContainer {...props} />,
    wrapper: Wrapper = React.Fragment,
    dragOverlayWrapper,
    ...props
}: SortableListProps<Item>) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);

    if (!items.length) {
        return <></>;
    }

    return (
        <div {...props}>
            {title && <Heading level={6} separator={titleSeparator} grey>{title}</Heading>}
            <div className={`${title && titleSeparator ? '-mt-2' : ''}`}>
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                        onMove(event.active.id as string, event.over?.id as string);
                        setDraggingId(null);
                    }}
                    onDragStart={event => setDraggingId(event.active.id as string)}
                >
                    <Wrapper>
                        <SortableContext
                            items={items}
                            strategy={verticalListSortingStrategy}
                        >
                            {items.map(item => (
                                <SortableItem key={item.id} container={container} dragHandleClass={dragHandleClass} id={item.id} separator={itemSeparator}>{renderItem(item)}</SortableItem>
                            ))}
                        </SortableContext>
                    </Wrapper>
                    <DragOverlay wrapperElement={dragOverlayWrapper}>
                        {draggingId ? container({
                            id: draggingId,
                            isDragging: true,
                            children: renderItem(items.find(({id}) => id === draggingId)!)
                        }) : null}
                    </DragOverlay>
                </DndContext>
            </div>
            {hint &&
            <>
                {!itemSeparator && <Separator />}
                <Hint>{hint}</Hint>
            </>
            }
        </div>
    );
};

export default SortableList;
