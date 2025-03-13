import React from 'react';
import useFeatureFlag from '../hooks/useFeatureFlag';
import {Button, confirmIfDirty, useGlobalDirtyState} from '@tryghost/admin-x-design-system';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const hasActivityPub = useFeatureFlag('ActivityPub');

    const navigateAway = () => {
        window.location.hash = hasActivityPub ? '/activitypub' : '/dashboard';
    };

    return (
        <Button className='text-grey-700 hover:!text-grey-900' data-testid="exit-settings" icon='close' id="done-button" label='' link={true} title='Close (ESC)' onClick={() => confirmIfDirty(isDirty, navigateAway)} />
    );
};

export default ExitSettingsButton;
