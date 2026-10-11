import { cva } from 'class-variance-authority';

const tabsVariants = cva('', {
  variants: {
    variant: {
      segmented: '',
      'segmented-sm': '',
      button: '',
      'button-sm': '',
      underline: '',
      navbar: '',
      pill: '',
      kpis: '',
    },
  },
  defaultVariants: {
    variant: 'segmented',
  },
});

export { tabsVariants };
