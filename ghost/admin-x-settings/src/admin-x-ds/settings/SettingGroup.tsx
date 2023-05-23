import ButtonGroup from '../global/ButtonGroup';
import React from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import {IButton} from '../global/Button';

export type TSettingGroupStates = 'view' | 'edit' | 'unsaved';

interface SettingGroupProps {
    navid?:string;
    title?: string;
    description?: React.ReactNode;
    state?: TSettingGroupStates;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    children?: React.ReactNode;

    /**
     * Default buttons only appear if onStateChange is implemented
     */
    onStateChange?: (newState: TSettingGroupStates) => void
    onSave?: () => void
    onCancel?: () => void
}

const SettingGroup: React.FC<SettingGroupProps> = ({
    navid,
    title,
    description,
    state,
    customHeader,
    customButtons,
    children,
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
        onStateChange?.('view');
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
        <div className={`flex flex-col gap-6 rounded border p-5 md:p-7 ${styles}`} id={navid && navid}>
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