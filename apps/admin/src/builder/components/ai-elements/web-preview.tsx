import {Button, Input} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';

import type {ComponentProps} from 'react';

export const WebPreview = ({className, ...props}: ComponentProps<typeof Stack>) => (
    <Stack className={cn('size-full min-h-0 overflow-hidden bg-surface-elevated', className)} gap='none' {...props} />
);

export const WebPreviewNavigation = ({className, ...props}: ComponentProps<typeof Inline>) => (
    <Inline align='center' className={cn('shrink-0 border-b border-border-default bg-surface-elevated px-2 py-1.5', className)} gap='xs' {...props} />
);

export const WebPreviewNavigationButton = ({className, ...props}: ComponentProps<typeof Button>) => (
    <Button className={cn('size-8 shrink-0', className)} size='icon' type='button' variant='ghost' {...props} />
);

export const WebPreviewUrl = ({className, ...props}: ComponentProps<typeof Input>) => (
    <Input className={cn('h-8 min-w-0 bg-background text-sm', className)} {...props} />
);

export const WebPreviewBody = ({className, ...props}: ComponentProps<typeof Box>) => (
    <Box className={cn('min-h-0 flex-1 overflow-hidden bg-background', className)} {...props} />
);
