import type { ComponentProps } from 'react';
import { Button } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';

/** Top-right close control for fullscreen screens that hide the Admin sidebar. */
export function FullscreenCloseButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <div className="fixed top-2 right-0 z-50 m-8 flex justify-end tablet:top-0">
      <Button
        className={cn('text-muted-foreground hover:text-foreground', className)}
        size="icon"
        type="button"
        variant="ghost"
        {...props}
      >
        <LucideIcon.X className="size-6!" />
      </Button>
    </div>
  );
}
