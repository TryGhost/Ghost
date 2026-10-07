import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

export const SettingsNavigationRow = forwardRef<
  HTMLButtonElement,
  ComponentProps<'button'> & { icon: ReactNode }
>(function SettingsNavigationRow({ icon, children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'flex w-full items-center gap-2 px-5 py-3 text-left text-foreground hover:bg-interactive-hover focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden [&>svg]:size-4 [&>svg]:shrink-0',
        className,
      )}
      type="button"
      {...props}
    >
      {icon}
      <Text as="span" className="flex-1 text-control!" weight="medium">
        {children}
      </Text>
      <LucideIcon.ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  );
});
