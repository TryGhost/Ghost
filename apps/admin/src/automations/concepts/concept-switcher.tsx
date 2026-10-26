import React, { useEffect, useRef, useState } from 'react';
import { CONCEPTS, type ConceptId, setConcept, useConcept } from './concept';
import { CANVAS_CLEARED_ATTRIBUTE } from './use-expand-from-card';
import {
  Button,
  Field,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// D clears the canvas while the email editor is open, timed with the editor's grow and
// shrink: the zoom controls slide down, the sidebar toggle slides left (an open sidebar is
// closed and reopened by the canvas itself) and the flow fades. The automation header stays.
const EDITOR = '[data-testid="automation-editor"]';
const CLEARED = `${EDITOR}[${CANVAS_CLEARED_ATTRIBUTE}]`;
const ZOOM = '.react-flow__panel';
const SIDEBAR_TOGGLE = '[aria-label$="automation sidebar"][aria-expanded]';
const FLOW = '.react-flow__viewport';
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const clearCanvasStyles = `
${EDITOR} ${ZOOM}, ${EDITOR} ${SIDEBAR_TOGGLE} { transition: transform 200ms ${EASE}; }
${EDITOR} ${FLOW} { transition: opacity 200ms ${EASE}; }
${CLEARED} ${ZOOM} { transform: translateY(calc(100% + 2rem)); }
${CLEARED} ${SIDEBAR_TOGGLE} { transform: translateX(calc(-100% - 2rem)); }
${CLEARED} ${FLOW} { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  ${EDITOR} ${ZOOM}, ${EDITOR} ${SIDEBAR_TOGGLE}, ${EDITOR} ${FLOW} { transition: none; }
}
`;

// NY-1715 exploration only — never merge. The same hot corner as the NY-1498
// prototype's lane switcher: a flask in the bottom-right corner that stays hidden
// until the pointer is over that 64px square, it has keyboard focus, or its panel
// is open.
const ConceptSwitcher: React.FC = () => {
  const concept = useConcept();
  const [open, setOpen] = useState(false);
  const cornerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // The canvas (React Flow) swallows the pointer events Radix listens for to dismiss, so
  // clicks on it would leave the panel open. Watch in the capture phase instead.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !cornerRef.current?.contains(target) && !contentRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);
  return (
    <>
      <style>{clearCanvasStyles}</style>
      <div
        ref={cornerRef}
        className="group/proto fixed right-0 bottom-0 z-40 flex size-16 items-end justify-end p-4"
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label="Prototype concept"
              className={cn(
                'text-muted-foreground opacity-0 transition-opacity group-hover/proto:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
                open && 'bg-muted opacity-100',
              )}
              size="icon"
              type="button"
              variant="ghost"
            >
              <LucideIcon.FlaskConical strokeWidth={2} />
            </Button>
          </PopoverTrigger>
          <PopoverContent ref={contentRef} align="end" className="w-72" side="top">
            <Stack gap="lg">
              <Text size="md" weight="semibold">
                Prototype
              </Text>
              <RadioGroup
                aria-label="Prototype concept"
                value={concept}
                onValueChange={(next) => setConcept(next as ConceptId)}
              >
                {CONCEPTS.filter((option) => !option.hidden).map(({ id, label }) => (
                  <Field key={id} orientation="horizontal">
                    <RadioGroupItem id={`ny1715-concept-${id}`} value={id} />
                    <FieldLabel htmlFor={`ny1715-concept-${id}`}>{label}</FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
            </Stack>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default ConceptSwitcher;
