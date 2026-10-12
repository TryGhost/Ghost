import { cva } from 'class-variance-authority';

const bannerVariants = cva('relative block rounded-lg transition-all duration-300', {
  variants: {
    variant: {
      default: 'border border-border-default bg-surface-panel shadow-sm hover:shadow-md',
      gradient: [
        'cursor-pointer bg-surface-elevated',
        'shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_28%),7px_6px_42px_8px_rgb(202_103_255_/_32%)]',
        'dark:shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_36%),7px_6px_42px_8px_rgb(202_103_255_/_38%)]',
        'hover:shadow-[-7px_-4px_42px_10px_rgb(75_225_226_/_38%),7px_8px_42px_10px_rgb(202_103_255_/_42%)]',
        'dark:hover:shadow-[-7px_-4px_42px_10px_rgb(75_225_226_/_50%),7px_8px_42px_10px_rgb(202_103_255_/_52%)]',
        'hover:translate-y-[-2px] hover:scale-[1.01]',
      ],
      info: 'border border-state-info/40 bg-state-info/10',
      success: 'border border-state-success/40 bg-state-success/10',
      warning: 'border border-state-warning/40 bg-state-warning/10',
      destructive: 'border border-state-danger/20 bg-state-danger/10',
    },
    size: {
      sm: 'p-2 text-sm',
      md: 'p-3',
      lg: 'p-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export { bannerVariants };
