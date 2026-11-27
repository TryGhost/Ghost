import { cva } from 'class-variance-authority';

const selectTriggerVariants = cva(
  'flex h-(--control-height) w-full items-center justify-between px-3 py-2 text-(length:--text-field) whitespace-nowrap hover:bg-button-hover data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1',
  {
    variants: {
      variant: {
        default: '',
        // Ghost and secondary triggers read as buttons, so they keep a button's corners.
        ghost:
          'border-transparent bg-transparent shadow-none [--radius-field:var(--radius-control)] [--text-field:var(--text-control)]',
        secondary:
          'border-transparent bg-tab-active text-secondary-foreground shadow-none [--radius-field:var(--radius-control)] [--text-field:var(--text-control)] hover:bg-secondary',
      },
      shape: {
        rounded: 'rounded-field',
        pill: 'rounded-full',
      },
    },
    compoundVariants: [
      {
        variant: ['secondary', 'ghost'],
        className:
          'enabled:active:shadow-control-pressed enabled:aria-expanded:shadow-control-pressed',
      },
      {
        variant: 'ghost',
        className: 'enabled:active:bg-button-pressed enabled:aria-expanded:bg-button-pressed',
      },
      {
        variant: 'secondary',
        className: 'enabled:active:bg-secondary enabled:aria-expanded:bg-secondary',
      },
    ],
    defaultVariants: {
      variant: 'default',
      shape: 'rounded',
    },
  },
);

export { selectTriggerVariants };
