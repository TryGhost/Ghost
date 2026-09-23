import React, { useEffect, useRef } from 'react';
import type {
  AutomationDetail,
  AutomationSendEmailAction,
  AutomationWaitAction,
} from '@tryghost/admin-x-framework/api/automations';
import { Button, Field, FieldLabel, Input } from '@tryghost/shade/components';
import { EmailPerformanceSection } from './email-performance-section';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { MemberTier, StepSidebarDetail } from '@/automations/components/types';
import { TRIGGER_CANVAS_ID } from './nodes';
import { WaitDurationField } from './wait-duration-field';
import { formatWait } from './format-wait';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const SidebarField: React.FC<{ label: string; children: React.ReactNode; htmlFor?: string }> = ({
  children,
  htmlFor,
  label,
}) => (
  <Field>
    <FieldLabel className="text-sm font-medium text-text-secondary" htmlFor={htmlFor}>
      {label}
    </FieldLabel>
    {children}
  </Field>
);

// Public beta limitation: only one trigger type exists, so the read-only Select
// in the sidebar header would just mirror the title above it.
// const ReadOnlySelect: React.FC<{value: string}> = ({value}) => (
//     <Select value={value}>
//         <SelectTrigger disabled>
//             <span>{value}</span>
//         </SelectTrigger>
//     </Select>
// );

const DeleteStepButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
    type="button"
    variant="outline"
    onClick={onClick}
  >
    <LucideIcon.Trash2 className="size-4" />
    Delete step
  </Button>
);

const MEMBER_TIER_LABELS: Record<MemberTier, string> = {
  free: 'Free',
  paid: 'Paid',
};

const TriggerSidebarBody: React.FC<{ memberTiers: MemberTier[] }> = ({ memberTiers }) => {
  const selectedTiers = memberTiers.map((tier) => MEMBER_TIER_LABELS[tier]).join(', ');

  return (
    <div className="flex flex-col gap-5">
      {/* Public beta limitation: only one trigger type exists, so the read-only Select
                in the sidebar header would just mirror the title above it.
            <SidebarField label='Trigger'>
                <ReadOnlySelect value='New member sign up' />
            </SidebarField> */}
      {selectedTiers && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-secondary">Members</span>
          <span className="text-base text-foreground">{selectedTiers}</span>
        </div>
      )}
    </div>
  );
};

const WaitSidebarBody: React.FC<{
  action: AutomationWaitAction;
  onUpdate: (waitHours: number) => void;
  onDelete: () => void;
}> = ({ action, onUpdate, onDelete }) => (
  <div className="flex flex-1 flex-col gap-5">
    <WaitDurationField waitHours={action.data.wait_hours} onUpdate={onUpdate} />
    <div className="mt-auto pt-6">
      <DeleteStepButton onClick={onDelete} />
    </div>
  </div>
);

const SendEmailSidebarBody: React.FC<{
  automationId: string;
  action: AutomationSendEmailAction;
  onUpdateSubject: (subject: string) => void;
  onEditEmail: () => void;
  onDelete: () => void;
}> = ({ automationId, action, onUpdateSubject, onEditEmail, onDelete }) => {
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const automationAnalyticsEnabled = useFeatureFlag('automationAnalytics');

  useEffect(() => {
    subjectInputRef.current?.focus({ preventScroll: true });
  }, [action.id]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <SidebarField label="Subject line">
        <Input
          ref={subjectInputRef}
          placeholder="Subject line"
          value={action.data.email_subject}
          onChange={(e) => onUpdateSubject(e.target.value)}
        />
      </SidebarField>
      <Button className="w-full" type="button" variant="outline" onClick={onEditEmail}>
        <LucideIcon.Pencil className="size-4" />
        Edit email
      </Button>
      {automationAnalyticsEnabled && action.stats && (
        <EmailPerformanceSection
          actionId={action.id}
          automationId={automationId}
          stats={action.stats}
        />
      )}
      <div className="mt-auto pt-6">
        <DeleteStepButton onClick={onDelete} />
      </div>
    </div>
  );
};

const StepSidebarBody: React.FC<{ detail: StepSidebarDetail }> = ({ detail }) => {
  switch (detail.type) {
    case 'trigger':
      return <TriggerSidebarBody memberTiers={detail.memberTiers} />;
    case 'wait':
      return (
        <WaitSidebarBody
          key={detail.action.id}
          action={detail.action}
          onDelete={detail.onDelete}
          onUpdate={detail.onUpdate}
        />
      );
    case 'send_email':
      return (
        <SendEmailSidebarBody
          key={detail.action.id}
          action={detail.action}
          automationId={detail.automationId}
          onDelete={detail.onDelete}
          onEditEmail={detail.onEditEmail}
          onUpdateSubject={detail.onUpdateSubject}
        />
      );
    default: {
      const _exhaustive: never = detail;
      throw new Error(`Unknown sidebar type: ${String(_exhaustive)}`);
    }
  }
};

const StepSidebarContent: React.FC<{ detail: StepSidebarDetail }> = ({ detail }) => {
  const Icon = detail.icon;

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-sm text-text-secondary">{detail.label}</span>
            <h2
              className={cn(
                'truncate text-base leading-tight font-medium text-foreground',
                detail.isPlaceholderTitle && 'opacity-50',
              )}
            >
              {detail.title}
            </h2>
          </div>
        </div>
      </div>

      <StepSidebarBody detail={detail} />
    </div>
  );
};

const automationSlugMemberTiers: Record<string, MemberTier[]> = {
  'member-welcome-email-free': ['free'],
  'member-welcome-email-paid': ['paid'],
};

type StepSidebarDetailOptions = {
  automation: AutomationDetail;
  onDelete: (actionId: string) => void;
  onUpdateWait: (actionId: string, waitHours: number) => void;
  onUpdateSubject: (actionId: string, subject: string) => void;
  onEditEmail: (actionId: string) => void;
  stepId: string | null;
};

const getStepSidebarDetail = ({
  automation,
  stepId,
  onDelete,
  onUpdateWait,
  onUpdateSubject,
  onEditEmail,
}: StepSidebarDetailOptions): StepSidebarDetail | null => {
  if (!stepId) {
    return null;
  }

  if (stepId === TRIGGER_CANVAS_ID) {
    return {
      icon: LucideIcon.Zap,
      label: 'Trigger',
      title: 'Member signs up',
      memberTiers: (automation.slug && automationSlugMemberTiers[automation.slug]) || [],
      type: 'trigger',
    };
  }

  const action = automation.actions.find((item) => item.id === stepId);
  if (!action) {
    return null;
  }

  switch (action.type) {
    case 'wait': {
      const waitValue = formatWait(action.data.wait_hours);
      return {
        icon: LucideIcon.Clock,
        label: 'Wait',
        title: waitValue,
        action,
        onDelete: () => onDelete(action.id),
        onUpdate: (waitHours: number) => onUpdateWait(action.id, waitHours),
        type: 'wait',
      };
    }
    case 'send_email':
      return {
        automationId: automation.id,
        icon: LucideIcon.Mail,
        label: 'Send email',
        isPlaceholderTitle: !action.data.email_subject,
        title: action.data.email_subject || 'Untitled',
        action,
        onDelete: () => onDelete(action.id),
        onUpdateSubject: (subject: string) => onUpdateSubject(action.id, subject),
        onEditEmail: () => onEditEmail(action.id),
        type: 'send_email',
      };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown automation action type: ${String(_exhaustive)}`);
    }
  }
};

type StepSidebarProps = {
  automation: AutomationDetail;
  stepId: string | null;
  onDelete: (actionId: string) => void;
  onUpdateWait: (actionId: string, waitHours: number) => void;
  onUpdateSubject: (actionId: string, subject: string) => void;
  onEditEmail: (actionId: string) => void;
  isEmailModalOpen: boolean;
  onClose: () => void;
};

export const StepSidebar: React.FC<StepSidebarProps> = ({
  automation,
  stepId,
  onDelete,
  onUpdateWait,
  onUpdateSubject,
  onEditEmail,
  isEmailModalOpen,
  onClose,
}) => {
  const detail = getStepSidebarDetail({
    automation,
    stepId,
    onDelete,
    onUpdateWait,
    onUpdateSubject,
    onEditEmail,
  });

  useEffect(() => {
    if (!detail) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isEmailModalOpen) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detail, isEmailModalOpen, onClose]);

  return (
    <aside
      aria-hidden={!detail}
      aria-label="Step details"
      className={cn(
        'absolute inset-y-0 right-0 z-[1] flex w-[calc(100%-6rem)] max-w-none translate-x-full flex-col gap-6 overflow-y-auto bg-surface-elevated p-6 shadow-sm transition-transform duration-200 ease-out sm:w-[36rem] dark:border-l dark:border-gray-950',
        detail ? 'translate-x-0' : 'pointer-events-none',
      )}
      data-state={detail ? 'open' : 'closed'}
      data-testid="automation-step-sidebar"
    >
      {detail && <StepSidebarContent detail={detail} />}
    </aside>
  );
};
