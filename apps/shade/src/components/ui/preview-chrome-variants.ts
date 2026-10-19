import { cva } from 'class-variance-authority';

const previewChromeVariants = cva('size-full', {
  variants: {
    device: {
      desktop: 'px-8',
      mobile: 'h-[775px] w-[380px] rounded-3xl bg-surface-elevated p-2 shadow-xl',
    },
  },
  defaultVariants: {
    device: 'desktop',
  },
});

export { previewChromeVariants };
