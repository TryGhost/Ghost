import { cva } from 'class-variance-authority';

// Shared by panel tabs and route-based PageMenu navigation.
const tabSurfaceVariants = cva('', {
  variants: {
    admin7Design: {
      true: 'rounded-full bg-tab-inactive text-foreground hover:bg-tab-inactive-hover hover:text-foreground enabled:active:bg-tab-inactive-hover enabled:aria-expanded:bg-tab-inactive-hover enabled:aria-expanded:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground data-[state=active]:enabled:active:bg-primary data-[state=active]:enabled:aria-expanded:bg-primary data-[state=active]:enabled:aria-expanded:text-primary-foreground',
      false: '',
    },
    size: {
      default: '',
      compact: '',
    },
  },
  compoundVariants: [
    { admin7Design: true, size: 'default', className: 'px-4' },
    { admin7Design: true, size: 'compact', className: 'px-3' },
  ],
  defaultVariants: { size: 'default' },
});

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

export { tabsVariants, tabSurfaceVariants };
