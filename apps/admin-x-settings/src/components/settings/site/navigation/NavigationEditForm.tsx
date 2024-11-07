import NavigationItemEditor from './NavigationItemEditor';
import React from 'react';
import {Button, Icon, SortableList} from '@tryghost/admin-x-design-system';
import {NavigationEditor} from '../../../../hooks/site/useNavigationEditor';

const NavigationEditForm: React.FC<{
    baseUrl: string;
    navigation: NavigationEditor;
}> = ({baseUrl, navigation}) => {
    return <div className="w-full pt-2">
        <SortableList
            items={navigation.items}
            itemSeparator={false}
            renderItem={item => (
                <NavigationItemEditor
                    action={<Button className='mt-1 self-center' icon="trash" iconColorClass='dark:text-white' size='sm' onClick={() => navigation.removeItem(item.id)} />}
                    baseUrl={baseUrl}
                    clearError={key => navigation.clearError(item.id, key)}
                    item={item}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                />
            )}
            onMove={navigation.moveItem}
        />
        <div className='flex items-center gap-3'>
            <Icon colorClass='text-grey-300 dark:text-grey-900 mt-1' name='add' size='sm' />
            <NavigationItemEditor
                action={<Button className='mx-2 mt-1 self-center rounded bg-green p-1' data-testid="add-button" icon="add" iconColorClass='text-white' size='sm' unstyled onClick={navigation.addItem} />}
                baseUrl={baseUrl}
                className="mt-1"
                clearError={key => navigation.clearError(navigation.newItem.id, key)}
                data-testid="new-navigation-item"
                item={navigation.newItem}
                labelPlaceholder="New item label"
                updateItem={navigation.setNewItem}
            />
        </div>
    </div>;
};

export default NavigationEditForm;
