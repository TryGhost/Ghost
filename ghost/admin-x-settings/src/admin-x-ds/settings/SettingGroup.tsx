import ButtonGroup from '../global/ButtonGroup';
import React from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import {IButton} from '../global/Button';

export type TSettingGroupStates = 'view' | 'edit' | 'unsaved';
export type SaveState = 'saving' | 'saved' | 'error' | '';

interface SettingGroupProps {
    navid?:string;
    testId?: string;
    title?: string;
    description?: React.ReactNode;
    state?: TSettingGroupStates;
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
    onStateChange?: (newState: TSettingGroupStates) => void
    onSave?: () => void
    onCancel?: () => void
}

const SettingGroup: React.FC<SettingGroupProps> = ({
    navid,
    testId,
    title,
    description,
    state,
    saveState,
    customHeader,
    customButtons,
    children,
    hideEditButton,
    alwaysShowSaveButton = true,
    border = true,
    styles,
    onStateChange,
    onSave,
    onCancel
}) => {
    const handleEdit = () => {
        if (onStateChange) {
            onStateChange('edit');
        }
    };

    const handleCancel = () => {
        onCancel?.();
        onStateChange?.('view');
    };

    const handleSave = () => {
        onSave?.();
    };

    switch (state) {
    case 'edit':
        styles += ' border-grey-300';
        break;

    case 'unsaved':
        styles += ' border-green';
        break;

    default:
        styles += ' border-grey-200';
        break;
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

    let editButtons: IButton[] = [
        {
            label: 'Cancel',
            key: 'cancel',
            onClick: handleCancel
        }
    ];

    if (state === 'unsaved' || alwaysShowSaveButton) {
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
                        (onStateChange && <ButtonGroup buttons={state === 'view' ? viewButtons : editButtons} link={true} />)}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
};

export default SettingGroup;
