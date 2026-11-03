import { cva } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button-variants';
import { inputSurface } from '@/components/ui/input-surface';
import { cn } from '@/lib/utils';
import type { ControlShape } from '@/providers/shade-context';

const dropzoneBaseVariants = cva(
  'flex cursor-pointer flex-col items-center justify-center outline-hidden',
  {
    variants: {
      variant: {
        default: cn(
          inputSurface('self'),
          'border-2 border-dashed bg-transparent p-10 hover:border-border-strong',
        ),
        filled: cn(
          inputSurface('self'),
          'border-transparent bg-muted p-3 hover:bg-interactive-hover',
        ),
        button: 'flex-row',
        buttonSecondary: 'flex-row',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// Keep the exported variants function useful outside the component, with current defaults.
function dropzoneVariants(
  props: Parameters<typeof dropzoneBaseVariants>[0] = {},
  shape: ControlShape = 'pill',
) {
  return cn(
    dropzoneBaseVariants(props),
    props.variant === 'button' && buttonVariants({ shape, variant: 'outline' }),
    props.variant === 'buttonSecondary' &&
      buttonVariants({ shape, size: 'sm', variant: 'secondary' }),
    props.className,
  );
}

export { dropzoneVariants };
