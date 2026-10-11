import { cva } from 'class-variance-authority';
import { inputSurface } from '@/components/ui/input-surface';

const radioGroupItemVariants = cva(
  [
    inputSurface('self'),
    'peer grid size-4 shrink-0 place-content-center rounded-full border-border-strong p-0 text-primary enabled:hover:bg-interactive-hover data-[state=checked]:border-primary',
  ],
  {
    variants: {
      indicator: {
        dot: '',
        check:
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground enabled:data-[state=checked]:hover:bg-primary',
      },
    },
    defaultVariants: {
      indicator: 'dot',
    },
  },
);

export { radioGroupItemVariants };
