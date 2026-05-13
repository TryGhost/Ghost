import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Button, type ButtonProps, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import type {AutomationEditState} from '../types';

export type AutomationRequestState = 'idle' | 'loading' | 'error';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoadingAutomation: boolean;
    editState: AutomationEditState;
    onPublish: () => void;
    onTurnOff: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
    automation,
    isLoadingAutomation,
    editState,
    onPublish,
    onTurnOff
}) => {
    const name = automation?.name;
    const status = automation?.status;

    let isPublishButtonEnabled = automation?.status === 'inactive';
    let publishButtonVariant: ButtonProps['variant'] = 'default';
    let isTurnOffButtonEnabled = true;
    let publishButtonChildren: React.ReactNode = automation?.status === 'active' ? 'Published' : 'Publish changes';
    switch (editState) {
    case 'idle':
        break;
    case 'publishing':
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        publishButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                Publishing...
            </>
        );
        break;
    case 'unpublishing':
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'confirming unpublish':
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'failed to publish':
        publishButtonVariant = 'destructive';
        publishButtonChildren = 'Retry';
        break;
    case 'failed to unpublish':
        isTurnOffButtonEnabled = true;
        break;
    default: {
        const _exhaustive: never = editState;
        throw new Error(`Unhandled edit state: ${_exhaustive}`);
    }
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
                {status === 'active' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label='Automation options' size='icon' variant='ghost'>
                                <LucideIcon.Ellipsis />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            <DropdownMenuItem disabled={!isTurnOffButtonEnabled} onSelect={onTurnOff}>
                                <LucideIcon.Power className='size-4' />
                                Turn off
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button
                    disabled={!isPublishButtonEnabled}
                    variant={publishButtonVariant}
                    onClick={onPublish}
                >
                    {publishButtonChildren}
                </Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
