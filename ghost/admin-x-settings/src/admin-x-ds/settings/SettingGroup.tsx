import ButtonGroup from '../global/ButtonGroup';
import React, {useState} from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import {ButtonColors, IButton} from '../global/Button';

export type TSettingGroupStates = 'view' | 'edit' | 'unsaved';

interface SettingGroupProps {
    title?: string;
    description?: string;
    state?: TSettingGroupStates;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    children?: React.ReactNode;
    onStateChange?: (newState: TSettingGroupStates) => void
    onSave?: () => void
}

const SettingGroup: React.FC<SettingGroupProps> = ({title, description, state, customHeader, customButtons, children, onStateChange, onSave}) => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    if (state && state !== currentState) {
        setCurrentState(state);
    }

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
        if (onSave) {
            onSave();
        }
        if (onStateChange) {
            onStateChange('view');
        }
    };

    let styles = '';

    switch (currentState) {
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
            color: ButtonColors.Green,
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

    if (currentState === 'unsaved') {
        editButtons.push(
            {
                label: 'Save',
                key: 'save',
                color: ButtonColors.Green,
                onClick: handleSave
            }
        );
    }

    return (
        <div className={`flex flex-col gap-6 rounded border p-5 md:p-7 ${styles}`}>
            {customHeader ? customHeader : 
                <SettingGroupHeader description={description} title={title!}>
                    {customButtons ? customButtons : 
                        <ButtonGroup buttons={currentState === 'view' ? viewButtons : editButtons} link={true} />}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
};

export default SettingGroup;