import React from 'react';

export type TSettingGroupStates = 'view' | 'edit' | 'unsaved' | 'error' | 'new';

interface SettingGroupProps {
    state?: TSettingGroupStates;
    children?: React.ReactNode;
}

const SettingGroup: React.FC<SettingGroupProps> = ({state, children}) => {
    let styles = '';

    switch (state) {
    case 'edit':
        styles = 'border-grey-500';
        break;
        
    case 'unsaved':
        styles = 'border-green';
        break;
        
    case 'error':
        styles = 'border-red';
        break;

    case 'new':
        styles = 'border-purple';
        break;
            
    default:
        styles = 'border-grey-200';
        break;
    }

    return (
        <div className={`flex flex-col gap-6 rounded border p-5 md:p-7 ${styles}`}>
            {children}
        </div>
    );
};

export default SettingGroup;