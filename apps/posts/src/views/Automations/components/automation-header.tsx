import React from 'react';
import {Button, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';

interface AutomationHeaderProps {
    name?: string;
    isLoading?: boolean;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({name, isLoading = false}) => {
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
                <Button disabled={isLoading}>Publish changes</Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
