import { cva } from 'class-variance-authority';

// Shared by button tabs, including Settings previews, and PageMenu navigation.
const tabSurfaceVariants = cva('', {
  variants: {
    admin7Design: {
      true: 'rounded-full border border-border bg-transparent text-foreground hover:bg-tab-hover hover:text-foreground enabled:active:bg-button-ghost-hover enabled:aria-expanded:bg-button-ghost-hover enabled:aria-expanded:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-tab-inactive data-[state=active]:text-foreground data-[state=active]:hover:bg-tab-inactive data-[state=active]:hover:text-foreground data-[state=active]:enabled:active:bg-button-ghost-hover data-[state=active]:enabled:aria-expanded:bg-button-ghost-hover data-[state=active]:enabled:aria-expanded:text-foreground',
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
