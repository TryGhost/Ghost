import { cva } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center border font-semibold tracking-normal transition-colors focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground/70',
        destructive: 'border-transparent bg-destructive/20 text-destructive',
        success: 'border-transparent bg-green/20 text-green',
        warning: 'border-transparent bg-state-warning/20 text-yellow-600',
        outline: 'text-foreground',
      },
      size: {
        default: 'px-1.5 text-xs',
        sm: 'h-5 px-2 text-sm',
        md: 'h-6 px-2.5 text-sm',
      },
      shape: {
        rounded: 'rounded-xs',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'pill',
    },
  },
);

export { badgeVariants };
