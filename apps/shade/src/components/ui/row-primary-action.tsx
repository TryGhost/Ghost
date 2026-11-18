import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { rowSurfaceClasses } from '@/components/ui/row-surface';

interface RowPrimaryActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

/** Reuses the existing control; the row owns its expanded hit area and feedback. */
const RowPrimaryAction = React.forwardRef<HTMLButtonElement, RowPrimaryActionProps>(
  ({ asChild = false, className, children, onKeyDown, onKeyUp, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    const child =
      asChild && React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)
        ? children
        : undefined;
    const legacyAction =
      child &&
      typeof child.type === 'string' &&
      !['a', 'button', 'input', 'select', 'textarea'].includes(child.type) &&
      Boolean(child.props.onClick) &&
      child.props['aria-disabled'] !== true &&
      child.props['aria-disabled'] !== 'true';
    const childContent = child ? React.cloneElement(child, { className: undefined }) : children;
    return (
      <Component
        ref={ref}
        className={cn(
          rowSurfaceClasses.primaryAction,
          'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden',
          child?.props.className,
          className,
        )}
        {...(!asChild ? { type: 'button' as const } : {})}
        {...props}
        role={legacyAction ? (child.props.role ?? 'button') : props.role}
        tabIndex={legacyAction ? (child.props.tabIndex ?? 0) : props.tabIndex}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!legacyAction || event.defaultPrevented || event.target !== event.currentTarget) {
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.click();
          } else if (event.key === ' ') {
            event.preventDefault();
          }
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          if (
            legacyAction &&
            !event.defaultPrevented &&
            event.target === event.currentTarget &&
            event.key === ' '
          ) {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      >
        {childContent}
      </Component>
    );
  },
);
RowPrimaryAction.displayName = 'RowPrimaryAction';

export { RowPrimaryAction, RowPrimaryAction as TableRowAction };
