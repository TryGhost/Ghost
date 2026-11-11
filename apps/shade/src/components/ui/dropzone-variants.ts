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
      admin7Design: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: ['default', 'filled'],
        admin7Design: true,
        className: 'text-muted-foreground [&_svg.lucide]:stroke-[1.25px]',
      },
      { variant: 'default', admin7Design: true, className: 'border' },
    ],
    defaultVariants: {
      variant: 'default',
    },
  },
);

// Keep the exported variants function useful outside the component, with current defaults.
function dropzoneVariants(
  props: Omit<NonNullable<Parameters<typeof dropzoneBaseVariants>[0]>, 'admin7Design'> = {},
  shape: ControlShape = 'pill',
  admin7Design = true,
) {
  return cn(
    dropzoneBaseVariants({ variant: props.variant, admin7Design }),
    props.class,
    props.variant === 'button' && buttonVariants({ shape, variant: 'outline' }),
    props.variant === 'buttonSecondary' &&
      buttonVariants({ shape, size: 'sm', variant: 'secondary' }),
    props.className,
  );
}

export { dropzoneVariants };
