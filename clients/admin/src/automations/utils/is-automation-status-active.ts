import type { AutomationStatus } from '@tryghost/admin-x-framework/api/automations';

export const isAutomationStatusActive = (status: AutomationStatus): boolean => {
  switch (status) {
    case 'active':
      return true;
    case 'inactive':
    case 'archived':
      return false;
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unexpected automation status: ${String(_exhaustive)}`);
    }
  }
};
