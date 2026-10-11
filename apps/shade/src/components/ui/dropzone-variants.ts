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
  isAdmin7 = true,
  shape: ControlShape = isAdmin7 ? 'pill' : 'rounded',
) {
  return cn(
    dropzoneBaseVariants(props),
    props.variant === 'button' && buttonVariants({ isAdmin7, shape, variant: 'outline' }),
    props.variant === 'buttonSecondary' &&
      buttonVariants({ isAdmin7, shape, size: 'sm', variant: 'secondary' }),
    props.className,
  );
}

export { dropzoneVariants };
