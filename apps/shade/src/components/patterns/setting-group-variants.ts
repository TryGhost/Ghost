import { cva } from 'class-variance-authority';

const settingGroupVariants = cva(
  'group/setting-group relative flex flex-col gap-6 rounded-xl text-card-foreground transition-all',
  {
    variants: {
      variant: {
        outline: 'border border-border-default bg-card p-5 hover:shadow-sm md:p-7',
        plain: 'bg-transparent',
      },
      highlighted: {
        true: 'shadow-sm',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'outline',
      highlighted: false,
    },
  },
);

export { settingGroupVariants };
