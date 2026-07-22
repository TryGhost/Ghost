import NavigationItemEditor from './navigation-item-editor';
import React from 'react';
import {Button, Icon} from '@tryghost/admin-x-design-system';
import {Inline} from '@tryghost/shade/primitives';
import {type NavigationEditor} from '../../../../hooks/site/use-navigation-editor';
import {SortableList} from '@tryghost/shade/components';

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
                    action={<Button icon="trash" iconColorClass='dark:text-white' size='sm' onClick={() => navigation.removeItem(item.id)} />}
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
                <Icon colorClass='text-grey-300 dark:text-grey-900' name='add' size='sm' />
            </Inline>
            <NavigationItemEditor
                action={<Button className='mx-2 rounded bg-green p-1' data-testid="add-button" icon="add" iconColorClass='text-white' size='sm' unstyled onClick={navigation.addItem} />}
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
