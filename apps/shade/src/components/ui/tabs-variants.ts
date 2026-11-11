import { cva } from 'class-variance-authority';

// Shared pill geometry, with distinct button-tab and page-navigation surfaces.
const tabSurfaceVariants = cva('', {
  variants: {
    admin7Design: {
      true: 'rounded-full',
      false: '',
    },
    surface: {
      button: '',
      navigation: '',
    },
    size: {
      default: '',
      compact: '',
    },
  },
  compoundVariants: [
    {
      admin7Design: true,
      surface: 'button',
      className:
        'bg-tab-inactive text-foreground hover:bg-tab-inactive-hover hover:text-foreground enabled:active:bg-tab-inactive-hover enabled:aria-expanded:bg-tab-inactive-hover enabled:aria-expanded:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground data-[state=active]:enabled:active:bg-primary data-[state=active]:enabled:aria-expanded:bg-primary data-[state=active]:enabled:aria-expanded:text-primary-foreground',
    },
    {
      admin7Design: true,
      surface: 'navigation',
      className:
        'border border-border bg-transparent text-foreground hover:bg-tab-hover hover:text-foreground enabled:active:bg-tab-inactive enabled:aria-expanded:bg-tab-inactive enabled:aria-expanded:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-tab-inactive data-[state=active]:text-foreground data-[state=active]:hover:bg-tab-inactive data-[state=active]:hover:text-foreground data-[state=active]:enabled:active:bg-tab-inactive data-[state=active]:enabled:aria-expanded:bg-tab-inactive data-[state=active]:enabled:aria-expanded:text-foreground',
    },
    { admin7Design: true, size: 'default', className: 'px-4' },
    { admin7Design: true, size: 'compact', className: 'px-3' },
  ],
  defaultVariants: { size: 'default', surface: 'button' },
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
