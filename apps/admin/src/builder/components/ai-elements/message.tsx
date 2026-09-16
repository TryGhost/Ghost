import { Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { memo } from 'react';
import { Streamdown } from 'streamdown';

import type { ComponentProps, HTMLAttributes } from 'react';
import type { Components } from 'streamdown';

const safeMarkdownComponents: Components = {
  img: ({ alt }) => (
    <span className="text-muted-foreground">{alt ? `[Image: ${alt}]` : '[Image]'}</span>
  ),
};

export const Message = ({
  from,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { from: 'user' | 'assistant' }) => (
  <article
    className={cn('group w-full', from === 'user' ? 'flex justify-end' : '', className)}
    data-role={from}
    {...props}
  />
);

export const MessageContent = ({
  from,
  status,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
  status: 'pending' | 'complete' | 'interrupted';
}) => (
  <div
    className={cn(
      'max-w-[92%] min-w-0 space-y-2',
      from === 'user'
        ? 'builder-raised-dark builder-raised-surface rounded-2xl bg-surface-inverse px-4 py-3 text-surface-inverse-foreground'
        : 'text-foreground',
      className,
    )}
    {...props}
  >
    {children}
    {status === 'interrupted' && (
      <Text size="sm" tone="secondary">
        Interrupted
      </Text>
    )}
  </div>
);

export const MessageResponse = memo(
  ({ className, children, ...props }: ComponentProps<typeof Streamdown>) => (
    <Streamdown
      className={cn(
        'size-full min-w-0 wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className,
      )}
      {...props}
      components={{ ...props.components, ...safeMarkdownComponents }}
    >
      {children}
    </Streamdown>
  ),
);

MessageResponse.displayName = 'MessageResponse';
