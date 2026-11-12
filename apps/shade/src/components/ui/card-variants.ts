import { cva } from 'class-variance-authority';

const cardVariants = cva('flex flex-col bg-card text-card-foreground', {
  variants: {
    variant: {
      outline: 'rounded-card border border-border-default transition-all hover:shadow-xs',
      plain: '',
      ruled: 'border-t border-border',
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});

export { cardVariants };
