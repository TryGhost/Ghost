import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
}

/**
 * Inline text link. Always underlined so it reads as a link inside muted copy,
 * and inherits size and weight from the surrounding text.
 *
 * Use `asChild` to style a router link, or a `<button>` for an inline text action.
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, asChild = false, external = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a';
    const externalProps = external ? { rel: 'noopener noreferrer', target: '_blank' } : {};

    return (
      <Comp
        ref={ref}
        className={cn(
          'cursor-pointer rounded-xs text-foreground underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        data-slot="link"
        {...externalProps}
        {...props}
      />
    );
  },
);
Link.displayName = 'Link';

export { Link };
