import { cva } from 'class-variance-authority';

const indicatorVariants = cva('rounded-full', {
  variants: {
    variant: {
      neutral: 'bg-muted',
      info: 'bg-state-info',
      success: 'bg-state-success',
      error: 'bg-state-danger',
      warning: 'bg-state-warning',
    },
    state: {
      idle: '',
      active: 'animate-pulse',
      inactive: 'border-2 bg-transparent',
    },
    size: {
      sm: 'size-2',
      md: 'size-3',
      lg: 'size-4',
    },
  },
  compoundVariants: [
    // Inactive state borders match variant colors
    {
      variant: 'neutral',
      state: 'inactive',
      className: 'border-muted-foreground',
    },
    {
      variant: 'info',
      state: 'inactive',
      className: 'border-state-info',
    },
    {
      variant: 'success',
      state: 'inactive',
      className: 'border-state-success',
    },
    {
      variant: 'error',
      state: 'inactive',
      className: 'border-state-danger',
    },
    {
      variant: 'warning',
      state: 'inactive',
      className: 'border-state-warning',
    },
  ],
  defaultVariants: {
    variant: 'success',
    state: 'idle',
    size: 'sm',
  },
});

export { indicatorVariants };
