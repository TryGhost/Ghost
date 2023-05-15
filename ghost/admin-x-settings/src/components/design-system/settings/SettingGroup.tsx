import React from 'react';

interface SettingGroupProps {
    state?: 'view' | 'edit' | 'unsaved' | 'error' | 'new';
    children?: React.ReactNode;
}

const SettingGroup: React.FC<SettingGroupProps> = ({state, children}) => {
    let styles = '';

    switch (state) {
    case 'edit':
        styles = 'border-grey-400';
        break;
        
    case 'unsaved':
        styles = 'border-yellow';
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
        <div className={`rounded border p-5 md:p-7 ${styles}`}>
            {children}
        </div>
    );
};

export default SettingGroup;