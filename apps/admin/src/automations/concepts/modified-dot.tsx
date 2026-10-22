import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Indicator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { isCanvasCardV2, isConceptF, useConcept } from './concept';
import type { StepChangeKind } from './pending-changes';

// NY-1715 concepts: a muted pen button beside a card that differs from the last save; clicking
// it explains what the pen means. E (Canvas card v2) shows an "Unsaved" label instead —
// feedback was that a pen reads as an edit button, not as information.
const ModifiedDot: React.FC<{
  className?: string;
  changeKind?: StepChangeKind;
  onRevert?: () => void;
  revertLabel?: string;
}> = ({ className, changeKind, onRevert, revertLabel }) => {
  const concept = useConcept();
  if (isCanvasCardV2(concept)) {
    return (
      <EditedLabel
        // F names the change (Added, Updated, Deleted); E keeps the plain Unsaved changes dot.
        changeKind={isConceptF(concept) ? changeKind : undefined}
        className={className}
        revertLabel={revertLabel}
        // F only: E's marker is information, with no Revert.
        onRevert={isConceptF(concept) ? onRevert : undefined}
      />
    );
  }
  return <PenMarker className={className} />;
};

// The dot and word are hidden from screen readers: the card's own label says "modified".
// Beside a card the word shows on hovering the marker; beside the open editor it always shows.
// E: with onRevert, an underlined Revert follows the word, shown on hovering the marker or on
// keyboard focus, which puts the step back to the last save.
// With changeKind (F), the word names what the next save does to the step instead.
const changeKindLabels: Record<StepChangeKind, string> = {
  added: 'Add',
  updated: 'Update',
  deleted: 'Delete',
};
// Lucide's circle-dashed-check, copied from a newer Lucide than the one Ghost ships, which
// doesn't have it yet. Same 24px grid, stroke and caps as the other Lucide icons.
const CircleDashedCheck: React.FC<React.SVGProps<SVGSVGElement>> = ({ strokeWidth, ...props }) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth ?? 2}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M10.1 2.182a10 10 0 0 1 3.8 0" />
    <path d="M13.9 21.818a10 10 0 0 1-3.8 0" />
    <path d="m16 9-5.5 5.5L8 12" />
    <path d="M17.609 3.721a10 10 0 0 1 2.69 2.7" />
    <path d="M2.182 13.9a10 10 0 0 1 0-3.8" />
    <path d="M20.279 17.609a10 10 0 0 1-2.7 2.69" />
    <path d="M21.818 10.1a10 10 0 0 1 0 3.8" />
    <path d="M3.721 6.391a10 10 0 0 1 2.7-2.69" />
    <path d="M6.391 20.279a10 10 0 0 1-2.69-2.7" />
  </svg>
);

// And, like a GitHub diff, a coloured icon in place of the dot: a green plus for a new step,
// a grey dashed tick for an edited one, a red minus for one being deleted.
const changeKindIcons: Record<StepChangeKind, { icon: React.ElementType; className: string }> = {
  added: { icon: LucideIcon.CirclePlus, className: 'text-state-success' },
  updated: { icon: CircleDashedCheck, className: 'text-gray-600' },
  deleted: { icon: LucideIcon.CircleMinus, className: 'text-destructive' },
};

export const EditedLabel: React.FC<{
  changeKind?: StepChangeKind;
  className?: string;
  onRevert?: () => void;
  revertLabel?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}> = ({
  changeKind,
  className,
  onRevert,
  revertLabel = 'Revert to saved',
  showText = false,
  style,
}) => {
  const revealed =
    'opacity-0 transition-opacity group-focus-within/marker:opacity-100 group-hover/marker:opacity-100 motion-reduce:transition-none';
  return (
    <span
      className={cn(
        // 12px before Revert, so it reads apart from the words before it.
        'group/marker flex h-9 items-center gap-3 text-sm whitespace-nowrap text-muted-foreground',
        className,
      )}
      // The editor's marker fades out as the editor minimizes (useExpandFromCard).
      data-unsaved-marker=""
      style={style}
    >
      <span aria-hidden="true" className="flex items-center gap-1.5">
        {changeKind ? (
          React.createElement(changeKindIcons[changeKind].icon, {
            className: cn('size-4 shrink-0', changeKindIcons[changeKind].className),
            strokeWidth: 2,
          })
        ) : (
          // E: Shade's yellow (warning) dot, pulsing.
          <Indicator size="sm" state="active" variant="warning" />
        )}
        {/* The mark always shows. F's word joins it on hover or focus; E's cards show the dot
            alone, as the header's "Unsaved changes" explains it. */}
        {(showText || changeKind) && (
          <span className={cn(!showText && revealed)}>
            {changeKind ? changeKindLabels[changeKind] : 'Unsaved changes'}
          </span>
        )}
      </span>
      {onRevert && (
        // Underlined text rather than an icon, which read as Undo. The label names what it goes
        // back to; it starts with the visible word, so voice control can still say "Revert".
        <button
          aria-label={revertLabel}
          className={cn(
            'cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground',
            revealed,
          )}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRevert();
          }}
        >
          Revert
        </button>
      )}
    </span>
  );
};

// NY-1715 concept E: the email still has a TK reminder. Styled like Koenig's TK indicator
// beside a line in the editor (12px medium, grey-600, 4px padding); clicking it opens the
// email, as clicking the editor's jumps to the reminder. Its padding sits outside the lane's
// 24px gap, so the letters start where the dot would.
export const TkMarker: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    aria-label="Open email with TK reminders"
    className="-mx-1 cursor-pointer p-1 text-sm font-medium text-gray-600"
    type="button"
    onClick={onClick}
  >
    TK
  </button>
);

const PenMarker: React.FC<{ className?: string }> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // The canvas (React Flow) swallows the pointer events Radix listens for to dismiss, so
  // clicks on it would leave the popover open. Watch in the capture phase instead.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            aria-label="Unsaved changes"
            className={cn('text-muted-foreground', open && 'bg-muted')}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LucideIcon.Pen className="size-3.5" strokeWidth={2} />
          </Button>
        </PopoverTrigger>
        <PopoverContent ref={contentRef} align="start" className="w-auto" side="right">
          <Text size="sm">This step has unsaved changes</Text>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ModifiedDot;
