import {
    DndContext,
    DragOverlay,
    type DraggableAttributes,
    type DraggableSyntheticListeners,
    closestCenter
} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {Menu} from 'lucide-react';
import {
    type CSSProperties,
    type ElementType,
    Fragment,
    type HTMLAttributes,
    type ReactNode,
    useState
} from 'react';
import {Separator} from './separator';
import {cn} from '@/lib/utils';

export interface SortableItemContainerProps {
    id: string;
    setRef?: (element: HTMLElement | null) => void;
    isDragging: boolean;
    dragHandleAttributes?: DraggableAttributes;
    dragHandleListeners?: DraggableSyntheticListeners;
    dragHandleClass?: string;
    dragHandleLabel?: string;
    style?: CSSProperties;
    children: ReactNode;
    separator?: boolean;
}

export type DragIndicatorProps = Pick<SortableItemContainerProps, 'isDragging' | 'dragHandleAttributes' | 'dragHandleListeners' | 'dragHandleClass' | 'dragHandleLabel'> & HTMLAttributes<HTMLButtonElement>;

export const DragIndicator = ({
    isDragging,
    dragHandleAttributes,
    dragHandleListeners,
    dragHandleClass,
    dragHandleLabel,
    className,
    ...props
}: DragIndicatorProps) => (
    <button
        aria-label={dragHandleLabel || 'Reorder'}
        className={cn(
            'inline-flex items-center justify-center text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            dragHandleClass,
            className
        )}
        type="button"
        {...dragHandleAttributes}
        {...dragHandleListeners}
        {...props}
    >
        <Menu aria-hidden="true" className="size-4" />
    </button>
);

const DefaultContainer = ({
    setRef,
    isDragging,
    style,
    separator,
    children,
    ...props
}: SortableItemContainerProps) => (
    <div
        ref={setRef}
        className={cn(
            'group flex w-full items-center gap-3 bg-background py-1',
            separator && 'border-b border-border',
            isDragging && 'opacity-75'
        )}
        style={style}
    >
        <DragIndicator className="h-7" isDragging={isDragging} {...props} />
        {children}
    </div>
);

const SortableItem = ({
    id,
    children,
    separator,
    dragHandleClass,
    dragHandleLabel,
    container
}: {
    id: string;
    children: ReactNode;
    separator?: boolean;
    dragHandleClass?: string;
    dragHandleLabel?: string;
    container: (props: SortableItemContainerProps) => ReactNode;
}) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id});

    return container({
        id,
        setRef: setNodeRef,
        isDragging: false,
        separator,
        dragHandleClass,
        dragHandleLabel,
        dragHandleAttributes: attributes,
        dragHandleListeners: listeners,
        style: {
            transform: CSS.Transform.toString(transform),
            transition
        },
        children
    });
};

export interface SortableListProps<Item extends {id: string}> extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    titleSeparator?: boolean;
    hint?: ReactNode;
    items: Item[];
    itemSeparator?: boolean;
    dragHandleClass?: string;
    getDragHandleLabel?: (item: Item) => string;
    onMove: (id: string, overId: string) => void;
    renderItem: (item: Item) => ReactNode;
    container?: (props: SortableItemContainerProps) => ReactNode;
    wrapper?: ElementType;
    dragOverlayWrapper?: keyof JSX.IntrinsicElements;
}

/**
 * A vertically sortable list. Items must keep stable IDs across renders.
 */
export const SortableList = <Item extends {id: string}>({
    title,
    titleSeparator,
    hint,
    items,
    itemSeparator = true,
    dragHandleClass,
    getDragHandleLabel,
    onMove,
    renderItem,
    container = props => <DefaultContainer {...props} />,
    wrapper: Wrapper = Fragment,
    dragOverlayWrapper,
    className,
    ...props
}: SortableListProps<Item>) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const draggingItem = items.find(({id}) => id === draggingId);

    if (!items.length) {
        return null;
    }

    return (
        <div className={cn('w-full', className)} {...props}>
            {title && (
                <div className={cn('mb-2', titleSeparator && 'space-y-1')}>
                    <h6 className="text-base font-semibold text-muted-foreground">{title}</h6>
                    {titleSeparator && <Separator />}
                </div>
            )}
            <DndContext
                collisionDetection={closestCenter}
                onDragCancel={() => setDraggingId(null)}
                onDragEnd={(event) => {
                    if (event.over) {
                        onMove(String(event.active.id), String(event.over.id));
                    }
                    setDraggingId(null);
                }}
                onDragStart={event => setDraggingId(String(event.active.id))}
            >
                <Wrapper>
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        {items.map(item => (
                            <SortableItem
                                key={item.id}
                                container={container}
                                dragHandleClass={dragHandleClass}
                                dragHandleLabel={getDragHandleLabel?.(item)}
                                id={item.id}
                                separator={itemSeparator}
                            >
                                {renderItem(item)}
                            </SortableItem>
                        ))}
                    </SortableContext>
                </Wrapper>
                <DragOverlay wrapperElement={dragOverlayWrapper}>
                    {draggingItem ? container({
                        id: draggingItem.id,
                        isDragging: true,
                        dragHandleLabel: getDragHandleLabel?.(draggingItem),
                        children: renderItem(draggingItem)
                    }) : null}
                </DragOverlay>
            </DndContext>
            {hint && (
                <div className="space-y-1 pt-1 text-sm text-muted-foreground">
                    {!itemSeparator && <Separator />}
                    {hint}
                </div>
            )}
        </div>
    );
};
