import {Button, Indicator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {Box, Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {Link} from '@tryghost/admin-x-framework';

import type {BuilderSessionState} from '@/builder/core/builder-session';
import type {ReactNode} from 'react';

export const BuilderHeader = ({title, state, backTo, backLabel, backAction, publishAction}: {title: string; state: BuilderSessionState; backTo?: string; backLabel?: string; backAction?: ReactNode; publishAction?: ReactNode}) => {
    const isRunning = state.status === 'running';
    const statusIndicator = (label: string, variant: 'warning' | 'info', active = false) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <span aria-label={label} className='rounded-full p-1 outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring' role='status' tabIndex={0}>
                    <Indicator state={active ? 'active' : 'idle'} variant={variant} />
                </span>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
    return (
        <header className='z-10 h-16 shrink-0 bg-preview-canvas px-4'>
            <Inline align='center' className='size-full' gap='md' justify='between'>
                <Inline align='center' className='min-w-0 flex-1' gap='md'>
                    {backAction ?? (backTo && backLabel ? (
                        <Button className='size-8' size='icon' variant='ghost' asChild>
                            <Link aria-label={backLabel} to={backTo}>
                                <LucideIcon.ArrowLeft aria-hidden='true' />
                            </Link>
                        </Button>
                    ) : null)}
                    <Text as='h1' className='min-w-0 truncate' weight='medium'>{title}</Text>
                    <TooltipProvider delayDuration={200}>
                        {state.workspace.dirty && statusIndicator('Unsaved changes', 'warning')}
                        {isRunning && statusIndicator('Builder is running', 'info', true)}
                    </TooltipProvider>
                </Inline>
                {publishAction && <Box className='shrink-0 [&>button]:min-w-24 [&>button]:rounded-full [&>button]:px-6'>{publishAction}</Box>}
            </Inline>
        </header>
    );
};
