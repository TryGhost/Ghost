import React from 'react';
import {Button, confirmIfDirty, useGlobalDirtyState} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useGlobalData} from './providers/GlobalDataProvider';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const {settings, currentUser, config} = useGlobalData();
    const [hasActivityPub] = getSettingValues(settings, ['social_web_enabled']) as [boolean];

    const navigateAway = () => {
        if (config.labs.ui60) {
            window.location.hash = '/analytics';
        } else {
            window.location.hash = (hasActivityPub && hasAdminAccess(currentUser)) ? '/activitypub' : '/dashboard';
        }
    };

    return (
        <Button className='text-grey-700 hover:!text-grey-900' data-testid="exit-settings" icon='close' id="done-button" label='' link={true} title='Close (ESC)' onClick={() => confirmIfDirty(isDirty, navigateAway)} />
    );
};

export default ExitSettingsButton;
