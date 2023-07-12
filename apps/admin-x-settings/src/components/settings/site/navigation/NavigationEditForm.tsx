import Button from '../../../../admin-x-ds/global/Button';
import NavigationItemEditor from './NavigationItemEditor';
import React from 'react';
import SortableList from '../../../../admin-x-ds/global/SortableList';
import {NavigationEditor} from '../../../../hooks/site/useNavigationEditor';

const NavigationEditForm: React.FC<{
    baseUrl: string;
    navigation: NavigationEditor;
}> = ({baseUrl, navigation}) => {
    return <div className="w-full">
        <SortableList
            items={navigation.items}
            renderItem={item => (
                <NavigationItemEditor
                    action={<Button className='mr-2' icon="trash" size='sm' onClick={() => navigation.removeItem(item.id)} />}
                    baseUrl={baseUrl}
                    clearError={key => navigation.clearError(item.id, key)}
                    item={item}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                    unstyled
                />
            )}
            onMove={navigation.moveItem}
        />
        <NavigationItemEditor
            action={<Button className='self-center' color='green' data-testid="add-button" icon="add" iconColorClass='text-white' size='sm' onClick={navigation.addItem} />}
            baseUrl={baseUrl}
            className="p-2 pl-9"
            clearError={key => navigation.clearError(navigation.newItem.id, key)}
            data-testid="new-navigation-item"
            item={navigation.newItem}
            labelPlaceholder="New item label"
            textFieldClasses="w-full ml-2"
            updateItem={navigation.setNewItem}
        />
    </div>;
};

export default NavigationEditForm;
