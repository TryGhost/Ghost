import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';

import type {ComponentProps, ReactNode} from 'react';

export const Task = ({className, defaultOpen = false, ...props}: ComponentProps<'details'> & {defaultOpen?: boolean}) => (
    <details className={cn('group overflow-hidden rounded-md border border-border-default bg-surface-elevated', className)} {...(defaultOpen ? {open: true} : {})} {...props} />
);

export const TaskTrigger = ({children, className, ...props}: ComponentProps<'summary'>) => (
    <summary className={cn('cursor-pointer list-none px-3 py-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden', className)} {...props}>
        <Inline align='center' gap='sm' justify='between'>
            {children}
            <LucideIcon.ChevronDown aria-hidden='true' className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none' />
        </Inline>
    </summary>
);

export const TaskContent = ({children, className, ...props}: ComponentProps<typeof Stack>) => (
    <Stack className={cn('border-t border-border-default p-3', className)} gap='md' {...props}>
        {children}
    </Stack>
);

export const TaskItem = ({icon, title, status, children}: {
    icon: ReactNode;
    title: string;
    status: string;
    children?: ReactNode;
}) => (
    <Stack gap='xs'>
        <Inline align='center' gap='sm' justify='between'>
            <Inline align='center' gap='sm'>
                {icon}
                <Text size='sm' weight='medium'>{title}</Text>
            </Inline>
            <Text size='sm' tone='secondary'>{status}</Text>
        </Inline>
        {children}
    </Stack>
);
