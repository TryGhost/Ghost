import { cva } from 'class-variance-authority';

const settingsModalVariants = cva(
  'relative z-50 flex max-h-full w-full flex-col justify-between overflow-x-hidden bg-background text-foreground',
  {
    variants: {
      size: {
        sm: 'max-w-[480px] rounded-lg',
        md: 'max-w-[720px] rounded-lg',
        lg: 'max-w-[1020px] rounded-lg',
        xl: 'max-w-[1240px] rounded-lg',
        full: 'h-full rounded-lg',
        bleed: 'h-full',
      },
      align: {
        center: 'mx-auto',
        left: 'mr-auto',
        right: 'ml-auto',
      },
      scrolling: {
        true: 'overflow-y-auto',
        false: 'overflow-y-hidden',
      },
      formSheet: {
        true: 'shadow-md',
        false: 'shadow-xl',
      },
    },
    defaultVariants: {
      size: 'md',
      align: 'center',
      scrolling: true,
      formSheet: false,
    },
  },
);

export { settingsModalVariants };
