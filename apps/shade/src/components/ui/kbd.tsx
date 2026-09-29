import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const kbdVariants = cva(
  'pointer-events-none m-0 inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs border-none px-1 font-sans text-xs font-medium text-muted-foreground shadow-none select-none text-shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        contrast: 'bg-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface KbdProps extends React.ComponentProps<'kbd'>, VariantProps<typeof kbdVariants> {}

function Kbd({ className, variant, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        kbdVariants({ variant }),
        "[&_svg:not([class*='size-'])]:size-3",
        '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
        className,
      )}
      data-slot="kbd"
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      data-slot="kbd-group"
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
