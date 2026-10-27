import { inputSurface } from '@/components/ui/input-surface';
import { cn } from '@/lib/utils';

/** Shared chip density for token inputs such as labels, tags and authors. */
export const tokenFieldClasses = {
  field: cn(
    inputSurface('within'),
    'relative flex min-h-(--control-height) w-full cursor-text flex-wrap items-center gap-1 p-0.75 text-control',
  ),
  input:
    'min-w-20 flex-1 bg-transparent px-2 text-control outline-hidden placeholder:text-muted-foreground',
  // 24px on one line; long names wrap.
  chip: 'h-auto min-h-6 max-w-full cursor-pointer gap-1 rounded-xl border-transparent px-2 py-0.75 pr-1.5 text-left text-sm leading-4 whitespace-normal',
  // Matches Select's chevron; offsets start inside the 1px border.
  chevron:
    'pointer-events-none absolute top-[calc((var(--control-height)-var(--spacing)*4)/2-1px)] right-1.5 size-4 text-muted-foreground',
} as const;
