import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {useGlobalDirtyState} from '@tryghost/shade/utils';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();

    const navigateAway = () => {
        window.location.hash = '/';
    };

    return (
        <>
            <Button className='text-grey-700 hover:text-grey-900!' data-testid="exit-settings" icon='close' id="done-button" label='' link={true} title='Close (ESC)' onClick={() => confirm(isDirty, navigateAway)} />
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
};

export default ExitSettingsButton;
