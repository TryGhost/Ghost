import React from 'react';
import useGlobalDirtyState from '../hooks/useGlobalDirtyState';
import {Button} from '@tryghost/admin-x-design';
import {confirmIfDirty} from '../utils/modals';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();

    const navigateAway = () => {
        window.location.hash = '/dashboard';
    };

    return (
        <Button data-testid="exit-settings" label='&larr; Done' link={true} onClick={() => confirmIfDirty(isDirty, navigateAway)} />
    );
};

export default ExitSettingsButton;
