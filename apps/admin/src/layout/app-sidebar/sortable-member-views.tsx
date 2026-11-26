import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useReorderSegments } from '@tryghost/admin-x-framework/api/segments';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { cn } from '@tryghost/shade/utils';
import { type ReactNode, useMemo, useState } from 'react';
import { type NavSavedView, NavSavedViews } from './nav-saved-views';

/**
 * POC (poc/segments-ui): the sidebar's segments, dragged into a new order. The order is the
 * site's, so it changes every list of segments, for every staff user.
 *
 * `views` is every segment in the site's order. `visible` is the ones that can be dragged now:
 * all of them, or only those above the fold while the rest are folded away. A segment dropped on
 * another takes that one's place in the whole list.
 */
export function SortableMemberViews({
  views,
  visible,
  children,
}: {
  views: NavSavedView[];
  visible: NavSavedView[];
  /** The rows, rendered with `SortableMemberViewRows`, wherever the list puts them. */
  children: ReactNode;
}) {
  const { reorder } = useReorderSegments();
  const handleError = useHandleError();
  const [dragging, setDragging] = useState<NavSavedView | null>(null);
  const sensors = useSensors(
    // The distance leaves a click without movement to open the segment. The mouse and touch
    // sensors swallow the click that ends a drag, so a drop never opens it.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // The hold leaves a swipe that starts on a row to scroll the sidebar.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const announcements = useMemo<Announcements>(() => {
    const name = (id: UniqueIdentifier) => views.find((view) => view.key === id)?.name ?? '';
    const position = (id: UniqueIdentifier) =>
      `position ${views.findIndex((view) => view.key === id) + 1} of ${views.length}`;

    return {
      onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over && over.id !== active.id
          ? `${name(active.id)} moved to ${position(over.id)}.`
          : undefined,
      onDragEnd: ({ active, over }) =>
        over && over.id !== active.id
          ? `${name(active.id)} was dropped at ${position(over.id)}.`
          : `${name(active.id)} was dropped.`,
      onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
    };
  }, [views]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragging(views.find((view) => view.key === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over || active.id === over.id) {
      return;
    }
    const ids = views.map((view) => view.key);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) {
      reorder(arrayMove(ids, from, to)).catch(handleError);
    }
  };

  return (
    <DndContext
      // No keyboard drag: Enter and Space on a row open the segment.
      accessibility={{ announcements, screenReaderInstructions: { draggable: '' } }}
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <SortableContext
        items={visible.map((view) => view.key)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      {/* The row under the pointer, drawn above the sidebar, so the folded list's clipping
          can't cut it off. */}
      <DragOverlay>
        {dragging && (
          <ul className="cursor-grabbing list-none rounded-md bg-sidebar shadow-md">
            <NavSavedViews views={[dragging]} />
          </ul>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableRow({ view }: { view: NavSavedView }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: view.key,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && 'opacity-40')}
      // Up and down only: the sidebar is one column.
      style={{
        transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
        transition,
      }}
      {...listeners}
      // A link can be dragged out of the page by the browser itself, which would take the
      // pointer from the sort.
      onDragStart={(event) => event.preventDefault()}
    >
      <NavSavedViews views={[view]} />
    </div>
  );
}

/** Rows of the sortable list, which can sit in more than one place in the sidebar. */
export function SortableMemberViewRows({ views }: { views: NavSavedView[] }) {
  return views.map((view) => <SortableRow key={view.key} view={view} />);
}
