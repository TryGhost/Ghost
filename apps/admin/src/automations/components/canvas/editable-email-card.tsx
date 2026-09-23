import React, { useMemo } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  inputSurface,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { isEmptyEmailLexical } from '@/automations/utils';
import { AutomationCardWarning } from './automation-card-warning';
import { historyEmailPreview } from '@/automations/utils/history-email-preview';
import { AutomationCardMenu } from './automation-card-menu';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { EmailCardContent, EmailCardExcerpt, EmailCardMessage } from './email-card-content';
import type { NodeContextMenuEntry } from './nodes';

export type EditableEmailData = {
  subject: string;
  lexical: string;
  suppressWarning: boolean;
  onInteract: () => void;
  onUpdateSubject: (subject: string) => void;
  onEditContent: () => void;
};

export const EditableEmailCard: React.FC<
  React.PropsWithChildren<{
    email: EditableEmailData;
    selected: boolean;
    isNew: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
    footer?: React.ReactNode;
  }>
> = ({ email, selected, isNew, errorMessage, menuItems, footer, children }) => {
  const missingSubject = !email.subject.trim();
  const missingBody = isEmptyEmailLexical(email.lexical);
  const warning = email.suppressWarning
    ? undefined
    : missingSubject && missingBody
      ? 'Add a subject line and a message before this email can be sent.'
      : missingSubject
        ? 'Add a subject line before this email can be sent.'
        : missingBody
          ? 'Add a message before this email can be sent.'
          : errorMessage;
  const preview = useMemo(() => historyEmailPreview(null, email.lexical), [email.lexical]);
  const text = preview.content.state === 'available' ? preview.content.text : null;
  return (
    <AutomationCard
      aria-label={email.subject ? `Send email: ${email.subject}` : 'Send email'}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        selected && 'border-state-info',
        warning && 'border-state-warning',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={email.onInteract}
      onPointerDownCapture={email.onInteract}
    >
      {children}
      <AutomationCardHeader
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={warning} />
            <AutomationCardMenu label="Email actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.Mail className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Send email"
      />
      <EmailCardContent
        className="mt-3"
        message={
          <EmailCardMessage aria-label="Email message preview" className="border-0 p-0">
            <button
              aria-label="Edit email content"
              className={cn(
                inputSurface('self'),
                'group/field flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted',
              )}
              type="button"
              onClick={email.onEditContent}
            >
              <EmailCardExcerpt className="line-clamp-4 min-h-[4lh] text-[length:var(--text-control)] text-muted-foreground">
                {text || 'Message'}
              </EmailCardExcerpt>
              <LucideIcon.Pen
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none"
                strokeWidth={2}
              />
            </button>
          </EmailCardMessage>
        }
        subject={
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>Subject</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Subject line"
              value={email.subject}
              onChange={(event) => email.onUpdateSubject(event.target.value)}
            />
          </InputGroup>
        }
      />
      {footer}
    </AutomationCard>
  );
};
