import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 text-control whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
  {
    variants: {
      variant: {
        default:
          'bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:bg-control-disabled-surface disabled:text-muted-foreground/80 disabled:opacity-100',
        destructive:
          'bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-control-border bg-transparent font-medium hover:bg-button-hover hover:text-accent-foreground',
        secondary: 'font-medium text-secondary-foreground',
        subtle: 'font-medium',
        ghost: 'font-medium hover:bg-accent hover:text-accent-foreground',
        'destructive-ghost': 'font-medium text-destructive hover:text-destructive',
        link: 'font-medium text-primary underline-offset-4 hover:underline',
        dropdown:
          'border border-control-border bg-transparent hover:bg-button-hover hover:text-accent-foreground',
      },
      size: {
        default: 'h-(--control-height) px-2.5 py-2',
        sm: 'h-7 px-3 text-sm! [&_svg]:size-3',
        lg: 'h-11 px-8 text-md font-semibold',
        icon: 'size-9',
        'icon-sm': 'size-7 p-0 [&_svg]:size-3',
      },
      shape: {
        rounded: 'rounded-control',
        pill: 'rounded-full',
      },
    },
    compoundVariants: [
      { variant: 'secondary', className: 'bg-tab-active hover:bg-secondary' },
      {
        variant: 'destructive-ghost',
        className:
          'hover:bg-destructive/10 enabled:active:bg-destructive/10 enabled:aria-expanded:bg-destructive/10',
      },
      {
        variant: 'subtle',
        className: 'hover:bg-accent hover:text-accent-foreground',
      },
      {
        variant: ['secondary', 'ghost', 'destructive-ghost', 'subtle'],
        className:
          'enabled:active:shadow-control-pressed enabled:aria-expanded:shadow-control-pressed',
      },
      {
        variant: 'secondary',
        className: 'enabled:active:bg-secondary enabled:aria-expanded:bg-secondary',
      },
      {
        variant: ['ghost', 'subtle'],
        className:
          'enabled:active:bg-accent enabled:aria-expanded:bg-accent enabled:aria-expanded:text-accent-foreground',
      },
      {
        variant: 'ghost',
        className:
          'hover:bg-button-ghost-hover enabled:active:bg-button-ghost-hover enabled:aria-expanded:bg-button-ghost-hover',
      },
      {
        variant: 'default',
        size: ['default', 'sm', 'lg'],
        className: 'px-4',
      },
      {
        variant: [
          'destructive',
          'outline',
          'secondary',
          'ghost',
          'destructive-ghost',
          'dropdown',
          'subtle',
        ],
        size: ['default', 'sm', 'lg'],
        className: 'px-3',
      },
      {
        variant: 'outline',
        className:
          'border-0 shadow-control-outline enabled:active:shadow-control-outline-pressed enabled:aria-expanded:shadow-control-outline-pressed enabled:aria-expanded:bg-button-hover',
      },
      {
        size: 'icon',
        className: 'size-(--control-height) aspect-square p-0',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'pill',
    },
  },
);

export { buttonVariants };
