import React from 'react';
import {Button} from '@tryghost/shade/components';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {LucideIcon, useGlobalDirtyState} from '@tryghost/shade/utils';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();

    const navigateAway = () => {
        window.location.hash = '/';
    };

    return (
        <>
            <Button aria-label='Close settings' className='text-muted-foreground hover:text-foreground' data-testid='exit-settings' id='done-button' size='icon' title='Close (ESC)' type='button' variant='ghost' onClick={() => confirm(isDirty, navigateAway)}>
                <LucideIcon.X className='size-6!' />
            </Button>
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
};

export default ExitSettingsButton;
