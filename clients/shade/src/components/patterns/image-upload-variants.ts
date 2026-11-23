import { cva } from 'class-variance-authority';

const imageUploadPreviewVariants = cva(
  'group relative flex size-full items-center justify-center overflow-hidden rounded-md bg-muted',
  {
    variants: {
      background: {
        default: '',
        checkerboard:
          '[background-image:repeating-conic-gradient(var(--border-default)_0%_25%,var(--surface-elevated)_0%_50%)] [background-size:16px_16px]',
      },
    },
    defaultVariants: {
      background: 'default',
    },
  },
);

export { imageUploadPreviewVariants };
