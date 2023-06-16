import ButtonGroup from '../global/ButtonGroup';
import React from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import {ButtonProps} from '../global/Button';
import {SaveState} from '../../hooks/useForm';

interface SettingGroupProps {
    navid?:string;
    testId?: string;
    title?: string;
    description?: React.ReactNode;
    isEditing?: boolean;
    saveState?: SaveState;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    children?: React.ReactNode;
    hideEditButton?: boolean;
    alwaysShowSaveButton?: boolean;

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
}

const SettingGroup: React.FC<SettingGroupProps> = ({
    navid,
    testId,
    title,
    description,
    isEditing,
    saveState,
    customHeader,
    customButtons,
    children,
    hideEditButton,
    alwaysShowSaveButton = true,
    border = true,
    styles,
    onEditingChange,
    onSave,
    onCancel
}) => {
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
        styles += ' border-grey-300';
    } else {
        styles += ' border-grey-200';
    }

    let viewButtons = [];

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

    let editButtons: ButtonProps[] = [
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

    return (
        <div className={`relative flex flex-col gap-6 rounded ${border && 'border p-5 md:p-7'} ${styles}`} data-testid={testId}>
            <div className='absolute top-[-60px]' id={navid && navid}></div>
            {customHeader ? customHeader :
                <SettingGroupHeader description={description} title={title!}>
                    {customButtons ? customButtons :
                        (onEditingChange && <ButtonGroup buttons={isEditing ? editButtons : viewButtons} link={true} />)}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
};

export default SettingGroup;
