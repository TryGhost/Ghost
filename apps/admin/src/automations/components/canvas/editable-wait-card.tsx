import React, { useState } from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Inline } from '@tryghost/shade/primitives';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardWarning } from './automation-card-warning';
import { AutomationCardMenu } from './automation-card-menu';
import { WaitDurationField, WAIT_VALIDATION_MESSAGE } from './wait-duration-field';
import { EmailCardCollapse } from './email-card-analytics';
import { formatWait } from './format-wait';
import type { NodeContextMenuEntry } from './nodes';
import ModifiedDot from '@/automations/concepts/modified-dot';
import { isCanvasCardV2, isConceptF, useConcept } from '@/automations/concepts/concept';
import { inertWhen, restoreMenuItems } from '@/automations/concepts/deleted-step';
import type { StepChangeKind } from '@/automations/concepts/pending-changes';

export type EditableWaitData = {
  hours: number;
  onInteract: () => void;
  onValidityChange: (valid: boolean) => void;
  onUpdate: (hours: number) => void;
  // NY-1715 concept E: puts this wait back to the last save, from its Unsaved changes marker.
  onRevert?: () => void;
  // NY-1715 concept F: deleted since the last save, which will remove it.
  deleted?: boolean;
  // NY-1715 concept E: what the next save does to this wait, named beside it.
  changeKind?: StepChangeKind;
  revertLabel?: string;
  // NY-1715 concept E: what the yellow dot means, on hovering it.
  unsavedHint?: string;
};

export const EditableWaitCard: React.FC<
  React.PropsWithChildren<{
    wait: EditableWaitData;
    isNew: boolean;
    modified?: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ wait, isNew, errorMessage, menuItems, modified = false, children }) => {
  const [isInvalidShown, setIsInvalidShown] = useState(false);
  // NY-1715 concept E: an invalid wait is a plain Shade field error (red field, message
  // below), without the card's amber border and warning icon on top.
  const concept = useConcept();
  const showsErrorBelow = isCanvasCardV2(concept);
  const warning = isInvalidShown && !showsErrorBelow ? WAIT_VALIDATION_MESSAGE : errorMessage;
  const deleted = wait.deleted ?? false;
  // A step waiting to be deleted: F fades the whole card; E shrinks it to its header, titled
  // "Wait deleted".
  const fadesDeleted = deleted && isConceptF(concept);
  const showsDotInTitle = isCanvasCardV2(concept) && !isConceptF(concept);
  const shrinksDeleted = deleted && !isConceptF(concept);
  return (
    <AutomationCard
      aria-label={`Wait: ${formatWait(wait.hours)}${deleted ? ', deleted' : modified ? ', modified' : ''}`}
      className={cn(
        'group/card nodrag nopan relative w-[400px] text-left',
        warning && 'border-state-warning',
        // F: a step waiting to be deleted is the whole card at half strength (Shade's disabled
        // opacity), drawn with see-through colours rather than opacity, so the marker beside it
        // stays solid. Its shadow would only muddy the faded surface. E shrinks it instead.
        fadesDeleted && 'border-border-default/50 bg-surface-elevated/50 shadow-none',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      // Spacing above the field lives inside its collapse (below), so a shrunk card closes up.
      gap="none"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={wait.onInteract}
      onPointerDownCapture={wait.onInteract}
    >
      {children}
      {modified &&
        !showsDotInTitle && (
          // NY-1715 concepts: mirrors the ⋯ menu across the card edge: same 24px gap, same 36px box.
          <ModifiedDot
            changeKind={wait.changeKind}
            className="absolute top-6 left-full ml-6"
            revertLabel={wait.revertLabel}
            onRevert={wait.onRevert}
          />
        )}
      <div ref={inertWhen(fadesDeleted)} className={cn(fadesDeleted && 'opacity-50')}>
        <AutomationCardHeader
          actions={
            shrinksDeleted ? (
              <Inline gap="xs">
                {wait.onRevert && (
                  <AutomationCardMenu
                    label="Wait actions"
                    menuItems={restoreMenuItems(wait.onRevert)}
                  />
                )}
              </Inline>
            ) : (
              <Inline gap="xs">
                <AutomationCardWarning message={warning} />
                <AutomationCardMenu label="Wait actions" menuItems={menuItems} />
              </Inline>
            )
          }
          icon={<LucideIcon.Clock className="size-4" />}
          iconClassName={cn('p-2.5', shrinksDeleted ? 'text-muted-foreground' : 'text-foreground')}
          title={shrinksDeleted ? 'Wait deleted' : 'Wait'}
          titleAddon={
            // E: the yellow dot follows the title; hovering it says what it means.
            modified &&
            showsDotInTitle && (
              <ModifiedDot
                className="ml-1 inline-flex h-auto align-middle"
                hint={wait.unsavedHint}
              />
            )
          }
          titleClassName={
            // E: a deleted step's icon and title go muted, as it's on its way out.
            cn(shrinksDeleted && 'text-muted-foreground')
          }
        />
      </div>
      {/* E: a deleted wait's field folds away, leaving the header. */}
      <EmailCardCollapse open={!shrinksDeleted}>
        <div ref={inertWhen(deleted)} className={cn('pt-6', fadesDeleted && 'opacity-50')}>
          <WaitDurationField
            showsErrorBelow={showsErrorBelow}
            waitHours={wait.hours}
            inline
            onErrorVisibilityChange={setIsInvalidShown}
            onUpdate={wait.onUpdate}
            onValidityChange={wait.onValidityChange}
          />
        </div>
      </EmailCardCollapse>
    </AutomationCard>
  );
};
