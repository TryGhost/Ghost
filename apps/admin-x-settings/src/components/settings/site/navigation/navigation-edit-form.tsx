import NavigationItemEditor from './navigation-item-editor';
import React from 'react';
import {Button, SortableList} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {type NavigationEditor} from '../../../../hooks/site/use-navigation-editor';

const NavigationEditForm: React.FC<{
    baseUrl: string;
    navigation: NavigationEditor;
}> = ({baseUrl, navigation}) => {
    return <div className="w-full pt-2">
        <SortableList
            dragHandleClass='translate-y-0.5'
            getDragHandleLabel={item => `Reorder ${item.label || 'navigation item'}`}
            items={navigation.items}
            itemSeparator={false}
            renderItem={item => (
                <NavigationItemEditor
                    action={<Button aria-label='Delete navigation item' size='icon' type='button' variant='ghost' onClick={() => navigation.removeItem(item.id)}><LucideIcon.Trash2 /></Button>}
                    baseUrl={baseUrl}
                    clearError={key => navigation.clearError(item.id, key)}
                    item={item}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                />
            )}
            onMove={navigation.moveItem}
        />
        <Inline align='start' gap='md'>
            <Inline align='center' className='h-[calc(var(--control-height)+0.5rem)] shrink-0 translate-y-0.5 pt-2'>
                <LucideIcon.Plus className='size-4 text-muted-foreground' />
            </Inline>
            <NavigationItemEditor
                action={<Button aria-label='Add navigation item' data-testid="add-button" size='icon' type='button' variant='ghost' onClick={navigation.addItem}><LucideIcon.Plus /></Button>}
                addItem={navigation.addItem}
                baseUrl={baseUrl}
                className="mt-1"
                clearError={key => navigation.clearError(navigation.newItem.id, key)}
                data-testid="new-navigation-item"
                item={navigation.newItem}
                labelPlaceholder="New item label"
                updateItem={navigation.setNewItem}
            />
        </Inline>
    </div>;
};

export default NavigationEditForm;
