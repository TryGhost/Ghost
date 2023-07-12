import Button from '../../../../admin-x-ds/global/Button';
import NavigationItemEditor from './NavigationItemEditor';
import React from 'react';
import SortableList from '../../../../admin-x-ds/global/SortableList';
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
                    action={<Button className='self-center' icon="trash" size='sm' onClick={() => navigation.removeItem(item.id)} />}
                    baseUrl={baseUrl}
                    clearError={key => navigation.clearError(item.id, key)}
                    item={item}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                />
            )}
            onMove={navigation.moveItem}
        />
        <NavigationItemEditor
            action={<Button className='self-center' color='green' data-testid="add-button" icon="add" iconColorClass='text-white' size='sm' onClick={navigation.addItem} />}
            baseUrl={baseUrl}
            className="mt-1 pl-7"
            clearError={key => navigation.clearError(navigation.newItem.id, key)}
            data-testid="new-navigation-item"
            item={navigation.newItem}
            labelPlaceholder="New item label"
            updateItem={navigation.setNewItem}
        />
    </div>;
};

export default NavigationEditForm;
