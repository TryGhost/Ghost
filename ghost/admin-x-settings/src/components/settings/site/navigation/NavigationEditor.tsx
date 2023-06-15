import Button from '../../../../admin-x-ds/global/Button';
import NavigationItemEditor, {NavigationItem} from './NavigationItemEditor';
import React, {useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {CSS} from '@dnd-kit/utilities';
import {DndContext, DragOverlay, closestCenter} from '@dnd-kit/core';
import {SortableContext, arrayMove, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';

type DraggableItem = NavigationItem & { id: string }

const SortableItem: React.FC<{
    baseUrl: string;
    item: DraggableItem;
    updateItem: (item: Partial<NavigationItem>) => void;
    onDelete: () => void;
}> = ({baseUrl, item, updateItem, onDelete}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({id: item.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <NavigationItemEditor
            ref={setNodeRef}
            baseUrl={baseUrl}
            dragHandleProps={{...attributes, ...listeners}}
            item={item}
            style={style}
            updateItem={updateItem}
            onDelete={onDelete}
        />
    );
};

const NavigationEditor: React.FC<{
    baseUrl: string;
    items: NavigationItem[];
    setItems: (items: NavigationItem[]) => void;
}> = ({baseUrl, items, setItems}) => {
    // Copy items to a local state we can reorder without changing IDs, so that drag and drop animations work nicely
    const [draggableItems, setLocalDraggableItems] = useState<DraggableItem[]>(items.map((item, index) => ({...item, id: index.toString()})));

    const [newItem, setNewItem] = useState<NavigationItem>({label: '', url: baseUrl});
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const setDraggableItems = (newItems: DraggableItem[]) => {
        setLocalDraggableItems(newItems);
        setItems(newItems.map(({id, ...item}) => item));
    };

    const updateItem = (id: string, item: Partial<NavigationItem>) => {
        setDraggableItems(draggableItems.map(current => (current.id === id ? {...current, ...item} : current)));
    };

    const addItem = () => {
        if (newItem.label && newItem.url) {
            setDraggableItems(draggableItems.concat({...newItem, id: draggableItems.length.toString()}));
            setNewItem({label: '', url: baseUrl});
        }
    };

    const removeItem = (id: string) => {
        setDraggableItems(draggableItems.filter(item => item.id !== id));
    };

    const moveItem = (activeId: string, overId?: string) => {
        if (activeId !== overId) {
            const fromIndex = draggableItems.findIndex(item => item.id === activeId);
            const toIndex = overId ? draggableItems.findIndex(item => item.id === overId) : 0;
            setDraggableItems(arrayMove(draggableItems, fromIndex, toIndex));
        }
        setDraggingId(null);
    };

    return <div className="w-full">
        <DndContext
            collisionDetection={closestCenter}
            onDragEnd={event => moveItem(event.active.id as string, event.over?.id as string)}
            onDragStart={event => setDraggingId(event.active.id as string)}
        >
            <SortableContext
                items={draggableItems}
                strategy={verticalListSortingStrategy}
            >
                {draggableItems.map(item => (
                    <SortableItem
                        // eslint-disable-next-line react/no-array-index-key
                        key={item.id}
                        baseUrl={baseUrl}
                        item={item}
                        updateItem={updates => updateItem(item.id, updates)}
                        onDelete={() => removeItem(item.id)}
                    />
                ))}
            </SortableContext>
            <DragOverlay>
                {draggingId ? <NavigationItemEditor baseUrl={baseUrl} item={draggableItems.find(({id}) => id === draggingId)!} isDragging /> : null}
            </DragOverlay>
        </DndContext>

        <div className="flex items-center gap-3 p-2">
            <span className='inline-block w-8'></span>
            <TextField className='grow' placeholder='New item label' value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
            <TextField className='ml-2 grow' value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})} />
            <Button color='green' icon="add" iconColorClass='text-white' size='sm' onClick={addItem} />
        </div>
    </div>;
};

export default NavigationEditor;
