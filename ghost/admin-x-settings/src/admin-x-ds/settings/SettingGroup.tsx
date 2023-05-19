import ButtonGroup from '../global/ButtonGroup';
import React from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import {IButton} from '../global/Button';

export type TSettingGroupStates = 'view' | 'edit' | 'unsaved';

interface SettingGroupProps {
    title?: string;
    description?: React.ReactNode;
    state?: TSettingGroupStates;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    children?: React.ReactNode;
    onStateChange?: (newState: TSettingGroupStates) => void
    onSave?: () => void
}

const SettingGroup: React.FC<SettingGroupProps> = ({title, description, state, customHeader, customButtons, children, onStateChange, onSave}) => {
    const handleEdit = () => {
        if (onStateChange) {
            onStateChange('edit');
        }
    };

    const handleCancel = () => {
        if (onStateChange) {
            onStateChange('view');
        }
    };

    const handleSave = () => {
        onSave?.();
        if (onStateChange) {
            onStateChange('view');
        }
    };

    let styles = '';

    switch (state) {
    case 'edit':
        styles = 'border-grey-500';
        break;

    case 'unsaved':
        styles = 'border-green';
        break;

    default:
        styles = 'border-grey-200';
        break;
    }

    const viewButtons = [
        {
            label: 'Edit',
            key: 'edit',
            color: 'green',
            onClick: handleEdit
        }
    ];

    let editButtons: IButton[] = [
        {
            label: 'Cancel',
            key: 'cancel',
            onClick: handleCancel
        }
    ];

    if (state === 'unsaved') {
        editButtons.push(
            {
                label: 'Save',
                key: 'save',
                color: 'green',
                onClick: handleSave
            }
        );
    }

    return (
        <div className={`flex flex-col gap-6 rounded border p-5 md:p-7 ${styles}`}>
            {customHeader ? customHeader :
                <SettingGroupHeader description={description} title={title!}>
                    {customButtons ? customButtons :
                        <ButtonGroup buttons={state === 'view' ? viewButtons : editButtons} link={true} />}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
};

export default SettingGroup;