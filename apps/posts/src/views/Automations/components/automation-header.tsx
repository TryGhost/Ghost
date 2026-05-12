import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoading: boolean;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({automation, isLoading}) => {
    const name = automation?.name;
    const isActive = automation?.status === 'active';

    return (
        <header className='relative z-10 flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-sm'>
            <div className='flex min-w-0 items-center gap-3'>
                <Button size='icon' variant='ghost' asChild>
                    <Link aria-label='Back to automations' to='/automations'>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Link>
                </Button>
                {isLoading ? (
                    <Skeleton className='h-5 w-40' />
                ) : (
                    <span className='truncate font-medium'>{name}</span>
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
                            {/* TODO(NY-1267) Make this button do something */}
                            <DropdownMenuItem>
                                <LucideIcon.Power className='size-4' />
                                Turn off
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button
                    // TODO(NY-1267) Make this button do something
                    disabled={isLoading || isActive}
                >
                    {isActive ? 'Published' : 'Publish changes'}
                </Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
