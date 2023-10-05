import Button from '../admin-x-ds/global/Button';
import React from 'react';
import useGlobalDirtyState from '../hooks/useGlobalDirtyState';
import {confirmIfDirty} from '../utils/modals';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();

    const navigateAway = () => {
        window.location.hash = '/dashboard';
    };

    return (
        <Button label='&larr; Done' link={true} onClick={() => confirmIfDirty(isDirty, navigateAway)} />
    );
};

export default ExitSettingsButton;
