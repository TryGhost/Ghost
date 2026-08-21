import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';

import type {ComponentProps, ReactNode} from 'react';

export const Task = ({className, defaultOpen = false, ...props}: ComponentProps<'details'> & {defaultOpen?: boolean}) => (
    <details className={cn('group w-full', className)} {...(defaultOpen ? {open: true} : {})} {...props} />
);

export const TaskTrigger = ({icon, title, className, ...props}: Omit<ComponentProps<'summary'>, 'children' | 'title'> & {icon: ReactNode; title: ReactNode}) => (
    <summary className={cn('group/trigger cursor-pointer list-none rounded-sm py-1 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden', className)} {...props}>
        <Inline align='center' className='min-w-0' gap='sm'>
            {icon}
            <Inline align='center' className='min-w-0' gap='xs'>
                <Text className='min-w-0 truncate' size='sm'>{title}</Text>
                <LucideIcon.ChevronRight aria-hidden='true' className='size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] group-open:rotate-90 group-hover/trigger:opacity-100 group-focus-visible/trigger:opacity-100 motion-reduce:transition-none' />
            </Inline>
        </Inline>
    </summary>
);

export const TaskContent = ({children, className, ...props}: ComponentProps<typeof Stack>) => (
    <Stack className={cn('mt-2', className)} gap='sm' {...props}>
        {children}
    </Stack>
);

export const TaskItem = ({icon, title, status, children}: {
    icon: ReactNode;
    title: string;
    status?: string;
    children?: ReactNode;
}) => (
    <Stack gap='xs'>
        <Inline align='center' gap='sm' justify='between'>
            <Inline align='center' gap='sm'>
                {icon}
                <Text size='sm'>{title}</Text>
            </Inline>
            {status && <Text size='sm' tone='secondary'>{status}</Text>}
        </Inline>
        {children}
    </Stack>
);
