import type { AutomationsRepository2 } from '../../../../../core/server/services/automations/automations-repository-2';

const fakeConnection = Symbol();
export type TestAutomationsRepositoryConnection = typeof fakeConnection;

const errorIfCalled = <T extends PropertyKey>(keys: ReadonlyArray<T>): Record<T, () => never> => {
  const result = {} as Record<T, () => never>;
  for (const key of keys) {
    result[key] = () => {
      throw new Error(`${String(key)} should not be called`);
    };
  }
  return result;
};

export const createTestAutomationsRepository2 = (
  overrides: Partial<AutomationsRepository2<TestAutomationsRepositoryConnection>> = {},
) => {
  return {
    withConnection: (fn) => fn(fakeConnection),
    withTransaction: (fn) => fn(fakeConnection),
    ...errorIfCalled([
      'deleteTriggerRules',
      'findFirstActionRevisions',
      'getNumberOfAutomations',
      'hasMemberEnteredAutomation',
      'insertActions',
      'insertRunSteps',
      'insertRuns',
      'insertTriggerRules',
      'isAutomationActiveForRun',
      'isAutomationActiveForRunStep',
      'loadEdgeRows',
      'lockMember',
    ]),
    ...overrides,
  } satisfies AutomationsRepository2<TestAutomationsRepositoryConnection>;
};
