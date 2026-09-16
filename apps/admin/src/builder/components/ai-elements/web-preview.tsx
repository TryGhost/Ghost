import { Button, Input } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

import type { ComponentProps } from 'react';

export const WebPreview = ({ className, ...props }: ComponentProps<typeof Stack>) => (
  <Stack
    className={cn('relative size-full min-h-0 bg-preview-canvas', className)}
    gap="none"
    {...props}
  />
);

export const WebPreviewNavigation = ({ className, ...props }: ComponentProps<typeof Inline>) => (
  <Inline
    align="center"
    className={cn('shrink-0 bg-preview-canvas p-4', className)}
    gap="xs"
    {...props}
  />
);

export const WebPreviewNavigationButton = ({
  className,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    className={cn('size-8 shrink-0 border border-transparent', className)}
    size="icon"
    type="button"
    variant="ghost"
    {...props}
  />
);

export const WebPreviewUrl = ({ className, ...props }: ComponentProps<typeof Input>) => (
  <Input
    className={cn(
      'builder-raised-surface h-8 min-w-0 rounded-full bg-surface-elevated px-4 text-center text-sm',
      className,
    )}
    {...props}
  />
);

export const WebPreviewBody = ({
  className,
  inert = false,
  ...props
}: ComponentProps<'div'> & { inert?: boolean }) => (
  <div
    className={cn('min-h-0 flex-1 overflow-hidden bg-preview-canvas', className)}
    {...(inert ? { inert: '' } : {})}
    {...props}
  />
);
