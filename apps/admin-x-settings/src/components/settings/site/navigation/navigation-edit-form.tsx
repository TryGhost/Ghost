import NavigationItemEditor from './navigation-item-editor';
import React from 'react';
import {Button, SortableList} from '@tryghost/admin-x-design-system';
import {type NavigationEditor} from '../../../../hooks/site/use-navigation-editor';
import {Plus} from 'lucide-react';
import {navigationColumnClasses, navigationDragHandleSpacerClasses, navigationRowClasses} from './navigation-layout';

const columnLabelClasses = 'text-xs font-semibold text-grey-700 dark:text-grey-500';
const actionButtonClasses = 'flex size-6 items-center justify-center rounded';
const addButtonClasses = 'flex size-[38px] cursor-pointer items-center justify-center rounded-lg bg-black text-white transition hover:bg-grey-900';

const NavigationEditForm: React.FC<{
    baseUrl: string;
    idPrefix: string;
    navigation: NavigationEditor;
    showPaidVisibility: boolean;
    showVisibility: boolean;
    uploadIcon?: (file: File) => Promise<string | undefined>;
}> = ({baseUrl, idPrefix, navigation, showPaidVisibility, showVisibility, uploadIcon}) => {
    return <div className="w-full pt-4">
        <div className='-mb-1 flex w-full items-center gap-3'>
            <div className={navigationDragHandleSpacerClasses} />
            <div className={navigationRowClasses}>
                <div className={`${navigationColumnClasses.icon} ${columnLabelClasses}`}>Icon</div>
                <div className={`${navigationColumnClasses.label} ${columnLabelClasses}`}>Label</div>
                <div className={`${navigationColumnClasses.url} ${columnLabelClasses}`}>URL</div>
                {showVisibility && <div className={`${navigationColumnClasses.visibility} ${columnLabelClasses}`}>Visibility</div>}
                <div className={navigationColumnClasses.action} />
            </div>
        </div>
        <SortableList
            dragHandleClass='opacity-100'
            items={navigation.items}
            itemSeparator={false}
            renderItem={item => (
                <NavigationItemEditor
                    action={<Button className={`${actionButtonClasses} text-grey-900 hover:bg-grey-200 hover:text-black dark:text-white dark:hover:bg-grey-900`} icon="trash" iconColorClass='dark:text-white' iconSize='sm' unstyled onClick={() => navigation.removeItem(item.id)} />}
                    baseUrl={baseUrl}
                    clearError={key => navigation.clearError(item.id, key)}
                    idPrefix={idPrefix}
                    item={item}
                    showPaidVisibility={showPaidVisibility}
                    showVisibility={showVisibility}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                    uploadIcon={uploadIcon}
                />
            )}
            onMove={navigation.moveItem}
        />
        <div className='mt-5 flex items-center gap-3 border-t border-grey-200 pt-5 dark:border-grey-800'>
            <div className={navigationDragHandleSpacerClasses} />
            <NavigationItemEditor
                action={<button aria-label='Add navigation item' className={addButtonClasses} data-testid="add-button" type='button' onClick={navigation.addItem}><Plus aria-hidden='true' className='size-4' /></button>}
                addItem={navigation.addItem}
                baseUrl={baseUrl}
                clearError={key => navigation.clearError(navigation.newItem.id, key)}
                data-testid="new-navigation-item"
                idPrefix={idPrefix}
                item={navigation.newItem}
                labelPlaceholder="New item label"
                showPaidVisibility={showPaidVisibility}
                showVisibility={showVisibility}
                updateItem={navigation.setNewItem}
                uploadIcon={uploadIcon}
            />
        </div>
    </div>;
};

export default NavigationEditForm;
