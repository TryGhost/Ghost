import type {AutomationAction, AutomationSendEmailAction, AutomationWaitAction} from '@tryghost/admin-x-framework/api/automations';

export type EmailModalMode = 'edit' | 'preview';
export type MemberTier = 'free' | 'paid';

type BaseStepSidebarDetail<Type extends string, LabelText extends string> = {
  icon: React.ElementType;
  isPlaceholderTitle?: boolean;
  title: string;
  label: LabelText;
  type: Type;
};

type ActionStepSidebarDetail<Action extends AutomationAction, LabelText extends string> = BaseStepSidebarDetail<Action['type'], LabelText> & {
  action: Action;
  onDelete: () => void;
};

type TriggerStepSidebarDetail = BaseStepSidebarDetail<'trigger', 'Trigger'> & {
  memberTiers: MemberTier[];
};

type WaitStepSidebarDetail = ActionStepSidebarDetail<AutomationWaitAction, 'Wait'> & {
  onUpdate: (waitHours: number) => void;
};

type SendEmailStepSidebarDetail = ActionStepSidebarDetail<AutomationSendEmailAction, 'Send email'> & {
  onUpdateSubject: (subject: string) => void;
  onEditEmail: () => void;
};

export type StepSidebarDetail = TriggerStepSidebarDetail | WaitStepSidebarDetail | SendEmailStepSidebarDetail;
