import Button from '../../../../admin-x-ds/global/Button';
import NavigationItemEditor, {NavigationItemEditorProps} from './NavigationItemEditor';
import React, {forwardRef, useState} from 'react';
import clsx from 'clsx';
import {CSS} from '@dnd-kit/utilities';
import {DndContext, DragOverlay, closestCenter} from '@dnd-kit/core';
import {EditableItem, NavigationEditor, NavigationItem} from '../../../../hooks/site/useNavigationEditor';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';

const ExistingItem = forwardRef<HTMLDivElement, NavigationItemEditorProps & { isDragging?: boolean, onDelete?: () => void }>(function ExistingItemEditor({isDragging, onDelete, ...props}, ref) {
    const containerClasses = clsx(
        'flex w-full items-start gap-3 rounded border-b border-grey-200 bg-white py-4 hover:bg-grey-100',
        isDragging && 'opacity-75'
    );

    const dragHandleClasses = clsx(
        'ml-2 h-7 pl-2',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
    );

    const textFieldClasses = clsx(
        'w-full border-b border-transparent bg-white px-2 py-0.5 hover:border-grey-300 focus:border-grey-600'
    );

    return (
        <NavigationItemEditor
            ref={ref}
            action={<Button className='mr-2' icon="trash" size='sm' onClick={onDelete} />}
            containerClasses={containerClasses}
            dragHandleClasses={dragHandleClasses}
            textFieldClasses={textFieldClasses}
            unstyled
            {...props}
        />
    );
});

const SortableItem: React.FC<{
    baseUrl: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItem) => void;
    updateItem: (item: Partial<NavigationItem>) => void;
    onDelete: () => void;
}> = ({baseUrl, item, clearError, updateItem, onDelete}) => {
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
        <ExistingItem
            ref={setNodeRef}
            baseUrl={baseUrl}
            clearError={clearError}
            dragHandleProps={{...attributes, ...listeners}}
            item={item}
            style={style}
            updateItem={updateItem}
            onDelete={onDelete}
        />
    );
};

const NavigationEditForm: React.FC<{
    baseUrl: string;
    navigation: NavigationEditor;
}> = ({baseUrl, navigation}) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const moveItem = (activeId: string, overId?: string) => {
        navigation.moveItem(activeId, overId);
        setDraggingId(null);
    };

    return <div className="w-full">
        <DndContext
            collisionDetection={closestCenter}
            onDragEnd={event => moveItem(event.active.id as string, event.over?.id as string)}
            onDragStart={event => setDraggingId(event.active.id as string)}
        >
            <SortableContext
                items={navigation.items}
                strategy={verticalListSortingStrategy}
            >
                {navigation.items.map(item => (
                    <SortableItem
                        // eslint-disable-next-line react/no-array-index-key
                        key={item.id}
                        baseUrl={baseUrl}
                        clearError={key => navigation.clearError(item.id, key)}
                        item={item}
                        updateItem={updates => navigation.updateItem(item.id, updates)}
                        onDelete={() => navigation.removeItem(item.id)}
                    />
                ))}
            </SortableContext>
            <DragOverlay>
                {draggingId ? <ExistingItem baseUrl={baseUrl} item={navigation.items.find(({id}) => id === draggingId)!} isDragging /> : null}
            </DragOverlay>
        </DndContext>

        <NavigationItemEditor
            action={<Button color='green' data-testid="add-button" icon="add" iconColorClass='text-white' size='sm' onClick={navigation.addItem} />}
            baseUrl={baseUrl}
            clearError={key => navigation.clearError(navigation.newItem.id, key)}
            containerClasses="flex items-start gap-3 p-2"
            data-testid="new-navigation-item"
            dragHandleClasses="ml-2 invisible"
            item={navigation.newItem}
            labelPlaceholder="New item label"
            textFieldClasses="w-full ml-2"
            updateItem={navigation.setNewItem}
        />
    </div>;
};

export default NavigationEditForm;
