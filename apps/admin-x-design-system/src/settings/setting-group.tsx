import clsx from 'clsx';
import React, {forwardRef, useEffect} from 'react';
import SettingGroupHeader from './setting-group-header';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';

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

    styles += ' border-grey-200 dark:border-grey-900 dark:hover:border-grey-800';

    const buttons = isEditing ? (
        <Inline className='mt-[-5px]' gap='sm'>
            <Button size='sm' type='button' variant='ghost' onClick={handleCancel}>Cancel</Button>
            {(saveState === 'unsaved' || alwaysShowSaveButton) && (
                <Button disabled={saveState !== 'unsaved'} size='sm' type='button' onClick={handleSave}>
                    {saveState === 'saving' ? 'Saving...' : 'Save'}
                </Button>
            )}
        </Inline>
    ) : (!hideEditButton || saveState === 'saved') ? (
        <Button className='mt-[-5px] -mr-1' size='sm' type='button' variant='ghost' onClick={handleEdit}>
            {saveState === 'saved' ? 'Saved' : 'Edit'}
        </Button>
    ) : null;

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
                            (onEditingChange && buttons)
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
                            (onEditingChange && buttons)
                        }
                    </SettingGroupHeader>
                }
                {children}
            </div>
        );
    }
});

export default SettingGroup;
