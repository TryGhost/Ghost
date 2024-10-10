import clsx from 'clsx';
import React, {forwardRef, useEffect} from 'react';
import {ButtonProps} from '../global/Button';
import ButtonGroup from '../global/ButtonGroup';
import SettingGroupHeader from './SettingGroupHeader';

export interface SettingGroupProps {
    navid?:string;
    testId?: string;
    title?: string;
    description?: React.ReactNode;
    isVisible?: boolean;
    isEditing?: boolean;
    saveState?: 'unsaved' | 'saved' | 'saving' | string;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    beta?: boolean;
    children?: React.ReactNode;
    hideEditButton?: boolean;
    alwaysShowSaveButton?: boolean;
    highlight?: boolean;

    /**
     * Show a green outline in case the modal that's been triggered from the group is closed
     */
    highlightOnModalClose?: boolean;

    /**
     * Remove borders and paddings
     */
    border?: boolean;
    styles?: string;

    /**
     * Default buttons only appear if onStateChange is implemented
     */
    onEditingChange?: (isEditing: boolean) => void
    onSave?: () => void
    onCancel?: () => void
    enableCMDS?: boolean
}

const SettingGroup = forwardRef<HTMLDivElement, SettingGroupProps>(function SettingGroup({
    navid,
    testId,
    title,
    description,
    isVisible = true,
    isEditing,
    saveState,
    customHeader,
    customButtons,
    beta = false,
    children,
    hideEditButton,
    alwaysShowSaveButton = true,
    border = true,
    highlight = false,
    highlightOnModalClose = true,
    styles,
    onEditingChange,
    onSave,
    onCancel,
    enableCMDS = true
}, ref) {
    const handleEdit = () => {
        onEditingChange?.(true);
    };

    const handleCancel = () => {
        onCancel?.();
        onEditingChange?.(false);
    };

    const handleSave = () => {
        onSave?.();
    };

    styles += ' border-grey-250 dark:border-grey-925';

    // The links visible before editing
    const viewButtons: ButtonProps[] = [];

    if (!hideEditButton) {
        let label = 'Edit';
        if (saveState === 'saved') {
            label = 'Saved';
        }
        viewButtons.push(
            {
                label,
                key: 'edit',
                color: 'clear',
                onClick: handleEdit
            }
        );
    } else if (saveState === 'saved') {
        viewButtons.push(
            {
                label: 'Saved',
                key: 'edit',
                color: 'green',
                onClick: handleEdit
            }
        );
    }

    // The buttons that show when you are editing
    const editButtons: ButtonProps[] = [
        {
            label: 'Cancel',
            key: 'cancel',
            onClick: handleCancel
        }
    ];

    if (saveState === 'unsaved' || alwaysShowSaveButton) {
        let label = 'Save';
        if (saveState === 'saving') {
            label = 'Saving...';
        }
        editButtons.push(
            {
                label: label,
                key: 'save',
                color: saveState === 'unsaved' ? 'green' : 'light-grey',
                disabled: saveState !== 'unsaved',
                onClick: handleSave
            }
        );
    }

    useEffect(() => {
        const handleCMDS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        if (enableCMDS) {
            window.addEventListener('keydown', handleCMDS);
            return () => {
                window.removeEventListener('keydown', handleCMDS);
            };
        }
    });

    const containerClasses = clsx(
        'relative flex-col gap-6 rounded-xl transition-all hover:border-grey-200',
        border && 'border p-5 hover:shadow-sm md:p-7',
        isVisible ? 'flex' : 'hidden',
        (highlight && highlightOnModalClose) && 'border-grey-200 shadow-sm',
        !isEditing ? 'is-not-editing group/setting-group' : 'border-grey-200 shadow-sm',
        styles
    );

    if (!isEditing) {
        return (
            <div className={containerClasses} data-testid={testId}>
                <div ref={ref} className='absolute' id={navid && navid}></div>
                {customHeader ? customHeader :
                    <SettingGroupHeader beta={beta} description={description} title={title!}>
                        {customButtons ? customButtons :
                            (onEditingChange && <ButtonGroup buttons={isEditing ? editButtons : viewButtons} className={isEditing ? 'mt-[-5px]  ' : '-mr-1 mt-[-5px]'} size='sm' />)
                        }
                    </SettingGroupHeader>
                }
                {children}
            </div>
        );
    } else {
        return (
            <div className={containerClasses} data-testid={testId}>
                <div ref={ref} className='absolute' id={navid && navid}></div>
                {customHeader ? customHeader :
                    <SettingGroupHeader beta={beta} description={description} title={title!}>
                        {customButtons ? customButtons :
                            (onEditingChange && <ButtonGroup buttons={isEditing ? editButtons : viewButtons} className={isEditing ? 'mt-[-5px]  ' : '-mr-1 mt-[-5px]'} size='sm' />)
                        }
                    </SettingGroupHeader>
                }
                {children}
            </div>
        );
    }
});

export default SettingGroup;
