export const AUTOMATION_STEP_TERMINAL_STATUSES = [
  'automation disabled',
  'failed',
  'finished',
  'member changed status',
  'member changed tier',
  'member unsubscribed',
] as const;

export type AutomationStepTerminalStatus = (typeof AUTOMATION_STEP_TERMINAL_STATUSES)[number];
export type AutomationStepStatus = 'pending' | AutomationStepTerminalStatus;
