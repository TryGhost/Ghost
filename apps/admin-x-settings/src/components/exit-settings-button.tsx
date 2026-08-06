import React from 'react';
import {Button} from '@tryghost/shade/components';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {LucideIcon, useGlobalDirtyState} from '@tryghost/shade/utils';

const ExitSettingsButton: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();

    const navigateAway = () => {
        // If the user came here from a "Connect Mailgun" alert in the automation editor, return them
        // exactly where they left off instead of dumping them on the dashboard. Consume the token so it
        // only applies to this round-trip. Key mirrors MAILGUN_RETURN_KEY in apps/admin's
        // use-mailgun-alert.ts (admin-x-settings can't import from apps/admin).
        let returnTo: string | null = null;
        try {
            returnTo = sessionStorage.getItem('ghost:settings-return-to');
            if (returnTo) {
                sessionStorage.removeItem('ghost:settings-return-to');
            }
        } catch {
            returnTo = null;
        }
        window.location.hash = returnTo || '/';
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
