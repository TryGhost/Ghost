import { cva } from 'class-variance-authority';

const cardVariants = cva('flex flex-col bg-card text-card-foreground', {
  variants: {
    variant: {
      outline: 'rounded-xl border border-border-default transition-all hover:shadow-xs',
      plain: '',
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});

export { cardVariants };
