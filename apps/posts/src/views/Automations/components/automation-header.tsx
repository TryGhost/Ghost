import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import type {AutomationDetail, AutomationStatus} from '@tryghost/admin-x-framework/api/automations';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoadingAutomation: boolean;
    pendingStatus: AutomationStatus | undefined;
    onPublish: () => void;
    onTurnOff: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
    automation,
    isLoadingAutomation,
    pendingStatus,
    onPublish,
    onTurnOff
}) => {
    const name = automation?.name;
    const status = automation?.status;
    const isActive = status === 'active';

    const isPublishing = pendingStatus === 'active';
    const isUnpublishing = pendingStatus === 'inactive';

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
                            <DropdownMenuItem disabled={isUnpublishing} onSelect={onTurnOff}>
                                <LucideIcon.Power className='size-4' />
                                Turn off
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button
                    disabled={!automation || isActive || isPublishing}
                    onClick={onPublish}
                >
                    {isActive ? 'Published' : 'Publish changes'}
                </Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
