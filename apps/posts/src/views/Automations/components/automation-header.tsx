import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

export type AutomationRequestState = 'idle' | 'loading' | 'error';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoadingAutomation: boolean;
    publishState: AutomationRequestState;
    unpublishState: AutomationRequestState;
    onPublish: () => void;
    onTurnOff: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
    automation,
    isLoadingAutomation,
    publishState,
    unpublishState,
    onPublish,
    onTurnOff
}) => {
    const name = automation?.name;
    const status = automation?.status;
    const isActive = status === 'active';

    const isPublishing = publishState === 'loading';
    const hasPublishError = publishState === 'error' && !isActive;
    const isUnpublishing = unpublishState === 'loading';

    let publishButtonChildren: React.ReactNode;
    if (isPublishing) {
        publishButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                Publishing...
            </>
        );
    } else if (hasPublishError) {
        publishButtonChildren = 'Retry';
    } else if (isActive) {
        publishButtonChildren = 'Published';
    } else {
        publishButtonChildren = 'Publish changes';
    }

    return (
        <header className='relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm'>
            <div className='flex min-w-0 items-center gap-3'>
                <Button size='icon' variant='ghost' asChild>
                    <Link aria-label='Back to automations' to='/automations'>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Link>
                </Button>
                {isLoadingAutomation ? (
                    <Skeleton className='h-5 w-40' />
                ) : (
                    <>
                        <span className='truncate font-medium'>{name}</span>
                        {status && <AutomationStatusBadge status={status} />}
                    </>
                )}
            </div>
            <div className='flex shrink-0 items-center gap-3'>
                {isActive && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label='Automation options' size='icon' variant='ghost'>
                                <LucideIcon.Ellipsis />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            {/* It's unlikely you'll be able to click this because there's
                                a modal in the way, but we disable it to be safe. */}
                            <DropdownMenuItem disabled={isUnpublishing} onSelect={onTurnOff}>
                                <LucideIcon.Power className='size-4' />
                                Turn off
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button
                    disabled={!automation || isActive || isPublishing}
                    variant={hasPublishError ? 'destructive' : 'default'}
                    onClick={onPublish}
                >
                    {publishButtonChildren}
                </Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
