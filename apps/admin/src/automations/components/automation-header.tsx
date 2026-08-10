import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Button, type ButtonProps, Skeleton} from '@tryghost/shade/components';
import {MailgunAlertPopover} from './mailgun-alert-popover';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {dangerText} from '@/automations/error-styles';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

export type AutomationRequestState = 'idle' | 'loading' | 'error';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoadingAutomation: boolean;
    hasUnsavedChanges: boolean;
    isSaveButtonEnabled: boolean;
    isPublishButtonEnabled: boolean;
    isUnpublishButtonEnabled: boolean;
    isDiscardButtonEnabled: boolean;
    // Whether the bulk-email (Mailgun) not-connected alert should render, and whether it's currently
    // fading out because a connection was just confirmed. Owned by the editor via useMailgunAlert.
    showMailgunAlert: boolean;
    mailgunAlertDismissing: boolean;
    // When true, this automation sends email but Mailgun isn't connected, so publishing would break.
    // Publish stays clickable and opens the alert popover instead of publishing.
    publishBlockedByMailgun: boolean;
    saveButtonVariant: ButtonProps['variant'];
    saveButtonChildren: React.ReactNode;
    onSave: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    onDiscard: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
    automation,
    isLoadingAutomation,
    hasUnsavedChanges,
    isSaveButtonEnabled,
    isPublishButtonEnabled,
    isUnpublishButtonEnabled,
    isDiscardButtonEnabled,
    showMailgunAlert,
    mailgunAlertDismissing,
    publishBlockedByMailgun,
    saveButtonVariant,
    saveButtonChildren,
    onSave,
    onPublish,
    onUnpublish,
    onDiscard
}) => {
    const name = automation?.name;
    const status = automation?.status;
    const isActive = status === 'active';
    const isInactive = status === 'inactive';

    // Which actions belong in the header is driven purely by status × unsaved changes:
    //   LIVE  · clean   → Unpublish
    //   LIVE  · unsaved → Unsaved indicator · Discard · Publish
    //   OFF   · clean   → Publish
    //   OFF   · unsaved → Unsaved indicator · Discard · Save · Publish
    // The disabled placeholder button the old header always rendered (e.g. a greyed "Published")
    // is gone; each state now shows only the actions it can actually perform.
    return (
        <header className='relative z-10 flex shrink-0 items-center justify-between bg-surface-elevated px-6 py-5 shadow-sm dark:border-b dark:border-gray-950'>
            <div className='flex min-w-0 items-center gap-3'>
                <Button variant='ghost' asChild>
                    <Link aria-label='Back to automations' to='/automations'>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Link>
                </Button>
                {isLoadingAutomation ? (
                    <Skeleton className='h-5 w-40' />
                ) : (
                    <>
                        <span className='truncate text-lg font-semibold'>{name}</span>
                        {status && <AutomationStatusBadge status={status} />}
                    </>
                )}
            </div>
            <div className='flex shrink-0 items-center gap-3'>
                {showMailgunAlert && (
                    <MailgunAlertPopover>
                        <Button
                            aria-label='Automation warnings'
                            className={cn(
                                'transition-all duration-300 ease-out',
                                mailgunAlertDismissing && 'pointer-events-none scale-90 opacity-0'
                            )}
                            data-mailgun-trigger=''
                            size='icon'
                            variant='ghost'
                        >
                            <LucideIcon.CircleAlert className={dangerText} strokeWidth={2} />
                        </Button>
                    </MailgunAlertPopover>
                )}
                {hasUnsavedChanges && (
                    <span
                        className='flex items-center gap-1.5 text-sm text-text-secondary'
                        data-testid='automation-unsaved-indicator'
                    >
                        <LucideIcon.AlertTriangle className='size-4 shrink-0' strokeWidth={2} />
                        Unsaved changes
                    </span>
                )}
                {isActive && !hasUnsavedChanges && (
                    <Button
                        disabled={!isUnpublishButtonEnabled}
                        variant='outline'
                        onClick={onUnpublish}
                    >
                        Unpublish
                    </Button>
                )}
                {hasUnsavedChanges && (
                    <Button
                        disabled={!isDiscardButtonEnabled}
                        variant='outline'
                        onClick={onDiscard}
                    >
                        Discard
                    </Button>
                )}
                {isInactive && hasUnsavedChanges && (
                    <Button
                        disabled={!isSaveButtonEnabled}
                        variant={saveButtonVariant}
                        onClick={onSave}
                    >
                        {saveButtonChildren}
                    </Button>
                )}
                {(isInactive || hasUnsavedChanges) && (
                    // When publishing is gated by Mailgun, keep the button live but let it open the
                    // alert popover (anchored to itself) rather than disabling it — a disabled button
                    // wouldn't explain why. One click teaches the constraint; the popover offers the fix.
                    publishBlockedByMailgun ? (
                        <MailgunAlertPopover>
                            <Button
                                data-mailgun-trigger=''
                                disabled={!isPublishButtonEnabled}
                                variant='default'
                            >
                                Publish
                            </Button>
                        </MailgunAlertPopover>
                    ) : (
                        <Button
                            disabled={!isPublishButtonEnabled}
                            variant='default'
                            onClick={onPublish}
                        >
                            Publish
                        </Button>
                    )
                )}
            </div>
        </header>
    );
};

export default AutomationHeader;
