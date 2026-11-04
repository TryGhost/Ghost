import { cva } from 'class-variance-authority';
import { inputSurfaceClasses } from '@/components/ui/input-surface';
import { cn } from '@/lib/utils';

const inputGroupVariants = cva(
  cn(
    // Shared surface chrome (border, bg, radius, transition, invalid state).
    inputSurfaceClasses.base,
    inputSurfaceClasses.invalidWithin,

    // Wrapper layout + group context (input-group specific).
    'group/input-group relative flex w-full items-center outline-hidden data-[disabled=true]:bg-field-disabled-surface [&>[data-slot=input-group-control]]:bg-transparent',
    'h-(--control-height) has-[>textarea]:h-auto',

    // Variants based on alignment.
    'has-[>[data-align=inline-start]]:[&>input]:pl-2',
    'has-[>[data-align=inline-end]]:[&>input]:pr-2',
    'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
    'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

    // Focus state — scoped to the input-group control specifically so that
    // focusing an InputGroupButton inside the group does NOT trigger the surface
    // focus ring. This is why we don't use inputSurface('within') here.
    'has-[[data-slot=input-group-control]:focus-visible]:border-focus-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-focus-ring/25 has-[[data-slot=input-group-control]:focus-visible]:outline-hidden',
    'in-data-[admin7-design=true]:has-[[data-slot=input-group-control]:focus-visible]:bg-control-surface',
  ),
  {
    variants: {
      variant: {
        default: '',
        // Ghost and secondary groups read as buttons until used, so they keep a button's corners.
        ghost:
          'border-transparent bg-transparent shadow-none [--radius-field:var(--radius-control)] [--text-field:var(--text-control)] hover:bg-button-hover',
        secondary:
          'border-transparent bg-tab-active text-secondary-foreground shadow-none [--radius-field:var(--radius-control)] [--text-field:var(--text-control)] hover:bg-secondary has-[[data-slot=input-group-control]:focus-visible]:bg-field-surface has-[[data-slot=input-group-control]:focus-visible]:hover:bg-field-surface has-[[data-slot=input-group-control]:not(:placeholder-shown)]:border-field-border has-[[data-slot=input-group-control]:not(:placeholder-shown)]:bg-field-surface has-[[data-slot=input-group-control]:not(:placeholder-shown)]:hover:bg-field-surface',
      },
      shape: {
        rounded: 'rounded-field',
        pill: 'rounded-full has-[>[data-align=block-end]]:rounded-field has-[>[data-align=block-start]]:rounded-field has-[>textarea]:rounded-field',
      },
    },
    defaultVariants: {
      variant: 'default',
      shape: 'rounded',
    },
  },
);

export { inputGroupVariants };
