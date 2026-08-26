import NavigationItemEditor from './navigation-item-editor';
import React from 'react';
import {Button, SortableList} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {type NavigationEditor} from '@/settings/hooks/site/use-navigation-editor';
import {navigationColumnClasses, navigationDragHandleSpacerClasses, navigationRowClasses} from './navigation-layout';

const columnLabelClasses = 'text-xs font-semibold text-muted-foreground';

const NavigationEditForm: React.FC<{
    baseUrl: string;
    idPrefix: string;
    navigation: NavigationEditor;
    showIcon: boolean;
    showPaidVisibility: boolean;
    showVisibility: boolean;
    uploadIcon?: (file: File) => Promise<string | undefined>;
}> = ({baseUrl, idPrefix, navigation, showIcon, showPaidVisibility, showVisibility, uploadIcon}) => {
    return <div className="w-full pt-2">
        {(showIcon || showVisibility) && (
            <div className='-mb-1 flex w-full items-center gap-3'>
                <div className={navigationDragHandleSpacerClasses} />
                <div className={navigationRowClasses}>
                    {showIcon && <div className={`${navigationColumnClasses.icon} ${columnLabelClasses}`}>Icon</div>}
                    <div className={`${navigationColumnClasses.label} ${columnLabelClasses}`}>Label</div>
                    <div className={`${navigationColumnClasses.url} ${columnLabelClasses}`}>URL</div>
                    {showVisibility && <div className={`${navigationColumnClasses.visibility} ${columnLabelClasses}`}>Visibility</div>}
                    <div className={navigationColumnClasses.action} />
                </div>
            </div>
        )}
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
                    idPrefix={idPrefix}
                    item={item}
                    showIcon={showIcon}
                    showPaidVisibility={showPaidVisibility}
                    showVisibility={showVisibility}
                    updateItem={updates => navigation.updateItem(item.id, updates)}
                    uploadIcon={uploadIcon}
                />
            )}
            onMove={navigation.moveItem}
        />
        <Inline align='start' className='mt-5 border-t pt-5' gap='md'>
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
                idPrefix={idPrefix}
                item={navigation.newItem}
                labelPlaceholder="New item label"
                showIcon={showIcon}
                showPaidVisibility={showPaidVisibility}
                showVisibility={showVisibility}
                updateItem={navigation.setNewItem}
                uploadIcon={uploadIcon}
            />
        </Inline>
    </div>;
};

export default NavigationEditForm;
