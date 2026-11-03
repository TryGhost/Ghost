import { cva } from 'class-variance-authority';

const bannerVariants = cva('relative block rounded-lg transition-all duration-300', {
  variants: {
    variant: {
      default: 'border border-border-default bg-surface-panel shadow-sm hover:shadow-md',
      gradient: [
        'cursor-pointer bg-surface-elevated',
        'shadow-[-7px_-6px_42px_8px_color-mix(in_oklab,var(--banner-glow-start)_28%,transparent),7px_6px_42px_8px_color-mix(in_oklab,var(--banner-glow-end)_32%,transparent)]',
        'dark:shadow-[-7px_-6px_42px_8px_color-mix(in_oklab,var(--banner-glow-start)_36%,transparent),7px_6px_42px_8px_color-mix(in_oklab,var(--banner-glow-end)_38%,transparent)]',
        'hover:shadow-[-7px_-4px_42px_10px_color-mix(in_oklab,var(--banner-glow-start)_38%,transparent),7px_8px_42px_10px_color-mix(in_oklab,var(--banner-glow-end)_42%,transparent)]',
        'dark:hover:shadow-[-7px_-4px_42px_10px_color-mix(in_oklab,var(--banner-glow-start)_50%,transparent),7px_8px_42px_10px_color-mix(in_oklab,var(--banner-glow-end)_52%,transparent)]',
        'hover:translate-y-[-2px] hover:scale-[1.01]',
      ],
      // Sits among other content, so its glow fades out within a card's padding
      'gradient-inline': [
        'bg-surface-elevated',
        'shadow-[-5px_-4px_28px_3px_color-mix(in_oklab,var(--banner-glow-start)_28%,transparent),5px_4px_28px_3px_color-mix(in_oklab,var(--banner-glow-end)_32%,transparent)]',
        'dark:shadow-[-5px_-4px_28px_3px_color-mix(in_oklab,var(--banner-glow-start)_36%,transparent),5px_4px_28px_3px_color-mix(in_oklab,var(--banner-glow-end)_38%,transparent)]',
        'hover:shadow-[-5px_-3px_28px_4px_color-mix(in_oklab,var(--banner-glow-start)_38%,transparent),5px_5px_28px_4px_color-mix(in_oklab,var(--banner-glow-end)_42%,transparent)]',
        'dark:hover:shadow-[-5px_-3px_28px_4px_color-mix(in_oklab,var(--banner-glow-start)_50%,transparent),5px_5px_28px_4px_color-mix(in_oklab,var(--banner-glow-end)_52%,transparent)]',
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
