import type { Automation } from '@tryghost/admin-x-framework/api/automations';

export const getNewAutomationName = (
  automations: Iterable<Readonly<Pick<Automation, 'name'>>>,
): string => {
  const existingNames = new Set<string>();
  for (const { name } of automations) {
    existingNames.add(name);
  }

  let result = 'New Automation';
  for (let suffix = 2; existingNames.has(result); suffix += 1) {
    result = `New Automation ${suffix}`;
  }

  return result;
};
