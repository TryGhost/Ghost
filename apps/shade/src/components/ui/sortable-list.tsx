import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  PointerSensor,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  hasSortableData,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS, isKeyboardEvent } from '@dnd-kit/utilities';
import { Menu } from 'lucide-react';
import {
  type CSSProperties,
  type ElementType,
  Fragment,
  type HTMLAttributes,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { Separator } from './separator';
import { cn } from '@/lib/utils';

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

export type DragIndicatorProps = Pick<
  SortableItemContainerProps,
  | 'isDragging'
  | 'dragHandleAttributes'
  | 'dragHandleListeners'
  | 'dragHandleClass'
  | 'dragHandleLabel'
> &
  HTMLAttributes<HTMLButtonElement>;

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
      className,
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
      isDragging && 'opacity-75',
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
  container,
}: {
  id: string;
  children: ReactNode;
  separator?: boolean;
  dragHandleClass?: string;
  dragHandleLabel?: string;
  container: (props: SortableItemContainerProps) => ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

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
      transition,
    },
    children,
  });
};

/**
 * Moves the dragged item one place per Up or Down arrow press. dnd-kit's
 * `sortableKeyboardCoordinates` picks the next item by distance, which skips or sticks on rows of
 * different heights. This picks it by index instead, and collision detection follows that pick
 * during a keyboard drag. The dragged item moves to the slot it will drop into.
 */
const createKeyboardMoves = () => {
  let targetId: UniqueIdentifier | null = null;

  const coordinateGetter: KeyboardCoordinateGetter = (
    event,
    { currentCoordinates, context: { active, droppableRects, droppableContainers } },
  ) => {
    if (!event.code.startsWith('Arrow')) {
      return undefined;
    }
    event.preventDefault();
    const step = event.code === 'ArrowDown' ? 1 : event.code === 'ArrowUp' ? -1 : 0;
    if (!step) {
      return undefined;
    }

    const activeContainer = active && droppableContainers.get(active.id);
    const activeRect = active && droppableRects.get(active.id);
    if (!active || !activeRect || !hasSortableData(activeContainer)) {
      return undefined;
    }
    const { items } = activeContainer.data.current.sortable;
    // Carry on from the active item if the target has left the list mid-drag.
    const from = targetId === null ? -1 : items.indexOf(targetId);
    const nextId = items[(from === -1 ? items.indexOf(active.id) : from) + step];
    const nextRect = nextId === undefined ? undefined : droppableRects.get(nextId);
    if (nextId === undefined || !nextRect) {
      return undefined;
    }
    targetId = nextId;

    const offset = items.indexOf(nextId) - items.indexOf(active.id);
    const top =
      offset > 0
        ? nextRect.top + nextRect.height - activeRect.height
        : offset < 0
          ? nextRect.top
          : activeRect.top;
    return { x: currentCoordinates.x, y: top };
  };

  // If the target leaves the list mid-drag, the lifted item stays where it started.
  const collisionDetection: CollisionDetection = (args) => {
    if (targetId === null || args.pointerCoordinates !== null) {
      return closestCenter(args);
    }
    const pinnedId = targetId;
    return args.droppableContainers.some(({ id }) => id === pinnedId)
      ? [{ id: pinnedId }]
      : [{ id: args.active.id }];
  };

  return {
    // One options object, so the sensors and handle listeners stay the same across renders.
    // Scrolls instantly, so a key pressed mid-scroll can't leave the lifted item off its slot.
    keyboardSensorOptions: { coordinateGetter, scrollBehavior: 'auto' as const },
    collisionDetection,
    /** Where a keyboard drag will drop, so the drop doesn't wait on a scroll to update `over`. */
    target: () => targetId,
    /** A keyboard drag starts on its own row, so scrolling the list can't move it. */
    reset: (id: UniqueIdentifier | null) => {
      targetId = id;
    },
  };
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'To pick up an item, press Space or Enter. Use the Up and Down arrow keys to move it. Press Space or Enter again to drop it in its new place, or press Escape to cancel.',
};

export interface SortableListProps<
  Item extends { id: string },
> extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  titleSeparator?: boolean;
  hint?: ReactNode;
  items: Item[];
  itemSeparator?: boolean;
  dragHandleClass?: string;
  /** The item's name, which screen readers announce while it's dragged. Defaults to `getDragHandleLabel`, then the id. */
  getItemLabel?: (item: Item) => string;
  /** The drag handle's accessible name. Defaults to `Reorder <item label>` when `getItemLabel` is set. */
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
export const SortableList = <Item extends { id: string }>({
  title,
  titleSeparator,
  hint,
  items,
  itemSeparator = true,
  dragHandleClass,
  getItemLabel,
  getDragHandleLabel,
  onMove,
  renderItem,
  container = (props) => <DefaultContainer {...props} />,
  wrapper: Wrapper = Fragment,
  dragOverlayWrapper,
  className,
  ...props
}: SortableListProps<Item>) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingItem = items.find(({ id }) => id === draggingId);
  // dnd-kit reports the row over itself as soon as it's picked up; only a change of place is a move.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const [keyboardMoves] = useState(createKeyboardMoves);
  // dnd-kit's default keyboard sensor moves 25px per press; this one moves to the next item.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, keyboardMoves.keyboardSensorOptions),
  );

  const handleLabel = (item: Item) => {
    const name = getItemLabel?.(item).trim();
    return getDragHandleLabel?.(item) || (name ? `Reorder ${name}` : undefined);
  };
  const indexOf = (id: UniqueIdentifier) => items.findIndex((item) => item.id === String(id));
  const nameOf = (id: UniqueIdentifier) => {
    const item = items[indexOf(id)];
    return (
      (item && (getItemLabel?.(item).trim() || getDragHandleLabel?.(item).trim())) || String(id)
    );
  };
  const dropId = (active: { id: UniqueIdentifier }, over: { id: UniqueIdentifier } | null) => {
    const target = keyboardMoves.target();
    if (target === null) {
      return over?.id ?? null;
    }
    return indexOf(target) === -1 ? active.id : target;
  };
  const removedMessage = 'Moving cancelled. The item is no longer in the list.';
  const positionOf = (id: UniqueIdentifier) => `position ${indexOf(id) + 1} of ${items.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOverId.current = active.id;
      return `Picked up ${nameOf(active.id)}, ${positionOf(active.id)}.`;
    },
    onDragOver: ({ active, over }) => {
      const overId = over?.id ?? null;
      if (overId === lastOverId.current) {
        return undefined;
      }
      lastOverId.current = overId;
      return overId === null
        ? `${nameOf(active.id)} is no longer over the list.`
        : `${nameOf(active.id)} moved to ${positionOf(overId)}.`;
    },
    onDragEnd: ({ active, over }) => {
      const overId = dropId(active, over);
      if (indexOf(active.id) === -1) {
        return removedMessage;
      }
      return overId === null
        ? `${nameOf(active.id)} dropped. It stays at ${positionOf(active.id)}.`
        : `${nameOf(active.id)} dropped at ${positionOf(overId)}.`;
    },
    onDragCancel: ({ active }) =>
      indexOf(active.id) === -1
        ? removedMessage
        : `Moving cancelled. ${nameOf(active.id)} stays at ${positionOf(active.id)}.`,
  };

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
        accessibility={{ announcements, screenReaderInstructions }}
        collisionDetection={keyboardMoves.collisionDetection}
        sensors={sensors}
        onDragCancel={() => setDraggingId(null)}
        onDragEnd={(event) => {
          const overId = dropId(event.active, event.over);
          // The lifted item may have been removed from the list during the drag.
          if (overId !== null && indexOf(event.active.id) !== -1) {
            onMove(String(event.active.id), String(overId));
          }
          setDraggingId(null);
        }}
        onDragStart={(event) => {
          // A drag keeps its target until the next one starts, so the drop announcement can read it.
          keyboardMoves.reset(isKeyboardEvent(event.activatorEvent) ? event.active.id : null);
          setDraggingId(String(event.active.id));
        }}
      >
        <Wrapper>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableItem
                key={item.id}
                container={container}
                dragHandleClass={dragHandleClass}
                dragHandleLabel={handleLabel(item)}
                id={item.id}
                separator={itemSeparator}
              >
                {renderItem(item)}
              </SortableItem>
            ))}
          </SortableContext>
        </Wrapper>
        <DragOverlay wrapperElement={dragOverlayWrapper}>
          {draggingItem
            ? container({
                id: draggingItem.id,
                isDragging: true,
                dragHandleLabel: handleLabel(draggingItem),
                children: renderItem(draggingItem),
              })
            : null}
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
