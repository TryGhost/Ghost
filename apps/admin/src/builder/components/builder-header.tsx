import {Button, Indicator} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {Link} from '@tryghost/admin-x-framework';

import type {BuilderSessionState} from '@/builder/core/builder-session';

export const BuilderHeader = ({title, state, backTo, backLabel}: {title: string; state: BuilderSessionState; backTo: string; backLabel: string}) => {
    const isRunning = state.status === 'running';
    return (
        <header className='z-10 h-14 shrink-0 border-b border-border-default bg-surface-elevated px-3 shadow-sm'>
            <Inline align='center' className='size-full' gap='md' justify='between'>
                <Inline align='center' className='min-w-0 flex-1' gap='md'>
                    <Button size='icon' variant='ghost' asChild>
                        <Link aria-label={backLabel} to={backTo}>
                            <LucideIcon.ArrowLeft aria-hidden='true' />
                        </Link>
                    </Button>
                    <Text as='h1' className='min-w-0 truncate' size='lg' weight='semibold'>{title}</Text>
                    {state.workspace.dirty && (
                        <Inline align='center' gap='xs'>
                            <Indicator label='Unsaved changes' variant='warning' />
                            <Text className='hidden sm:block' size='sm' tone='secondary'>Unsaved</Text>
                        </Inline>
                    )}
                    {isRunning && (
                        <Inline align='center' gap='xs'>
                            <Indicator label='Builder is running' state='active' variant='info' />
                            <Text className='hidden sm:block' size='sm' tone='secondary'>Running</Text>
                        </Inline>
                    )}
                </Inline>
                <Button className='shrink-0' type='button' disabled>Publish</Button>
            </Inline>
        </header>
    );
};
