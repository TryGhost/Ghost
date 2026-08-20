import {Stack, Text} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';

import type {HTMLAttributes, ReactNode} from 'react';

export const Message = ({from, className, ...props}: HTMLAttributes<HTMLElement> & {from: 'user' | 'assistant'}) => (
    <article className={cn('group w-full', from === 'user' ? 'flex justify-end' : '', className)} data-role={from} {...props} />
);

export const MessageContent = ({from, status, children}: {from: 'user' | 'assistant'; status: 'pending' | 'complete' | 'interrupted'; children: ReactNode}) => (
    <Stack
        className={cn(
            'max-w-[92%] min-w-0',
            from === 'user' ? 'rounded-xl bg-secondary px-4 py-3 text-foreground' : 'text-foreground'
        )}
        gap='sm'
    >
        <Text className='wrap-break-word whitespace-pre-wrap'>{children}</Text>
        {status === 'interrupted' && <Text size='sm' tone='secondary'>Interrupted</Text>}
    </Stack>
);
