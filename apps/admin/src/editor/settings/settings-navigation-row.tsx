import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

const rowClassName =
  'flex w-full items-center gap-2 px-5 py-3 text-left text-foreground hover:bg-interactive-hover focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden [&>svg]:size-4 [&>svg]:shrink-0';

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <Text as="span" className="flex-1 text-control!" weight="medium">
      {children}
    </Text>
  );
}

/** A row in the section list that opens its pane. */
export const SettingsNavigationRow = forwardRef<
  HTMLButtonElement,
  ComponentProps<'button'> & { icon: ReactNode }
>(function SettingsNavigationRow({ icon, children, className, ...props }, ref) {
  return (
    <button ref={ref} className={cn(rowClassName, className)} type="button" {...props}>
      {icon}
      <RowLabel>{children}</RowLabel>
      <LucideIcon.ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  );
});

/**
 * A row in the section list that shows its content inline beneath it rather
 * than in a pane. Its chevron turns down while the content is shown.
 */
export const SettingsDisclosureRow = forwardRef<
  HTMLButtonElement,
  Omit<ComponentProps<'button'>, 'aria-expanded'> & { icon: ReactNode; expanded: boolean }
>(function SettingsDisclosureRow({ icon, expanded, children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-expanded={expanded}
      className={cn(rowClassName, className)}
      type="button"
      {...props}
    >
      {icon}
      <RowLabel>{children}</RowLabel>
      <LucideIcon.ChevronRight
        className={cn(
          'size-4 shrink-0 text-text-tertiary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          expanded && 'rotate-90',
        )}
      />
    </button>
  );
});

/** A row in the section list that leaves the editor for a page in a new tab. */
export function SettingsLinkRow({
  icon,
  children,
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'rel' | 'target'> & { icon: ReactNode }) {
  return (
    <a className={cn(rowClassName, className)} rel="noopener noreferrer" target="_blank" {...props}>
      {icon}
      <RowLabel>{children}</RowLabel>
      <LucideIcon.ArrowUpRight className="size-4 shrink-0 text-text-tertiary" />
    </a>
  );
}
