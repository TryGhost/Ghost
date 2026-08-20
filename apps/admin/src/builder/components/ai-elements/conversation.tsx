import {useLayoutEffect, useRef, useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Stack, Text} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';

import type {HTMLAttributes, ReactNode} from 'react';

export const Conversation = ({className, children, ...props}: HTMLAttributes<HTMLDivElement>) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pinnedRef = useRef(true);
    const [isPinned, setIsPinned] = useState(true);

    const jumpToLatest = () => {
        const element = scrollRef.current;
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
        pinnedRef.current = true;
        setIsPinned(true);
    };

    useLayoutEffect(() => {
        if (pinnedRef.current) {
            jumpToLatest();
        }
    }, [children]);

    return (
        <div
            ref={scrollRef}
            aria-live='polite'
            className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
            role='log'
            onScroll={(event) => {
                const element = event.currentTarget;
                const nextPinned = element.scrollHeight - element.scrollTop - element.clientHeight <= 48;
                pinnedRef.current = nextPinned;
                setIsPinned(nextPinned);
            }}
            {...props}
        >
            {children}
            {!isPinned && (
                <Button aria-label='Jump to latest message' className='sticky bottom-3 mx-auto' size='sm' type='button' variant='outline' onClick={jumpToLatest}>
                    Jump to latest
                </Button>
            )}
        </div>
    );
};

export const ConversationContent = ({className, ...props}: HTMLAttributes<HTMLDivElement>) => (
    <Stack className={cn('mx-auto w-full max-w-3xl p-5', className)} gap='lg' {...props} />
);

export const ConversationEmptyState = ({icon, title, description}: {icon?: ReactNode; title: string; description: string}) => (
    <Stack align='center' className='m-auto max-w-sm px-6 text-center' gap='sm' justify='center'>
        {icon}
        <Text as='h2' size='lg' weight='semibold'>{title}</Text>
        <Text tone='secondary'>{description}</Text>
    </Stack>
);
