import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { bannerVariants } from '@/components/ui/banner-variants';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface BannerBaseProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'>, VariantProps<typeof bannerVariants> {
  /**
   * Semantic role of the banner
   * @default 'status'
   *
   * Note: role="status" has implicit aria-live="polite"
   *       role="alert" has implicit aria-live="assertive"
   *       role="region" requires aria-label
   */
  role?: 'status' | 'alert' | 'region';
}

export type BannerProps = BannerBaseProps &
  ({ dismissible: true; onDismiss: () => void } | { dismissible?: false; onDismiss?: never });

const Banner = React.forwardRef<HTMLDivElement, BannerProps>((props, ref) => {
  // onDismiss must be destructured to prevent React warning about invalid DOM props
  const {
    variant,
    size,
    dismissible = false,
    onDismiss,
    role = 'status',
    className,
    children,
    ...restProps
  } = props;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dismissible && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      ref={ref}
      className={cn(bannerVariants({ variant, size }), className)}
      role={role}
      {...restProps}
    >
      {dismissible && (
        <Button
          aria-label="Dismiss notification"
          className="absolute top-1 right-1 size-8 text-text-secondary hover:bg-transparent hover:text-text-primary"
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
        >
          <X className="size-5" />
        </Button>
      )}
      {children}
    </div>
  );
});

Banner.displayName = 'Banner';

export { Banner };
