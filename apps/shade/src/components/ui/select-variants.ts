import { cva } from 'class-variance-authority';

const selectTriggerVariants = cva(
  'flex h-(--control-height) w-full items-center justify-between px-3 py-2 text-control whitespace-nowrap hover:bg-button-hover data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1',
  {
    variants: {
      variant: {
        default: '',
        ghost: 'border-transparent bg-transparent shadow-none',
        secondary:
          'border-transparent bg-tab-active text-secondary-foreground shadow-none hover:bg-secondary',
      },
      shape: {
        rounded: 'rounded-control',
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
        className: 'enabled:active:bg-button-hover enabled:aria-expanded:bg-button-hover',
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
