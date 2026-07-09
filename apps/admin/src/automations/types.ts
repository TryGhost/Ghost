type AutomationEditAction = 'save' | 'publish' | 'republish' | 'unpublish';
type ConfirmableAutomationEditAction = 'publish' | 'republish' | 'unpublish';

export type AutomationEditState =
  | {phase: 'idle'; action?: undefined}
  | {phase: 'submitting' | 'failed'; action: AutomationEditAction}
  | {phase: 'confirming'; action: ConfirmableAutomationEditAction};
