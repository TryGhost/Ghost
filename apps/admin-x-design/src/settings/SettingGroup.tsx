import clsx from 'clsx';
import React, {forwardRef, useEffect} from 'react';
import {ButtonProps} from '../global/Button';
import ButtonGroup from '../global/ButtonGroup';
import SettingGroupHeader from './SettingGroupHeader';

// TODO: Wrap with removed logic in admin-x-settings

interface SettingGroupProps {
    navid?:string;
    testId?: string;
    title?: string;
    description?: React.ReactNode;
    isVisible?: boolean;
    isEditing?: boolean;
    saveState?: 'unsaved' | 'saved' | 'saving' | string;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
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

    if (saveState === 'unsaved') {
        styles += ' border-green';
    } else if (isEditing){
        styles += ' border-grey-700 dark:border-grey-600';
    } else {
        styles += ' border-grey-300 dark:border-grey-800 hover:border-grey-500';
    }

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
                color: 'green',
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
                label,
                key: 'save',
                color: 'green',
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
        'relative flex-col gap-6 rounded-lg transition-all',
        border && 'border p-5 md:p-7',
        isVisible ? 'flex' : 'hidden',
        (highlight && highlightOnModalClose) && 'before:pointer-events-none before:absolute before:inset-[1px] before:animate-setting-highlight-fade-out before:rounded before:shadow-[0_0_0_3px_rgba(48,207,67,0.45)]',
        !isEditing && 'is-not-editing group/setting-group',
        styles
    );

    return (
        <div className={containerClasses} data-testid={testId}>
            <div ref={ref} className='absolute' id={navid && navid}></div>
            {customHeader ? customHeader :
                <SettingGroupHeader description={description} title={title!}>
                    {customButtons ? customButtons :
                        (onEditingChange && <ButtonGroup buttons={isEditing ? editButtons : viewButtons} link linkWithPadding />)}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
});

export default SettingGroup;
