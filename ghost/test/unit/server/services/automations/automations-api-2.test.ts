import { createAutomationsApi2 } from '../../../../../core/server/services/automations/automations-api-2';
import {
  createTestAutomationsRepository2,
  type TestAutomationsRepositoryConnection,
} from './test-automations-repository-2';

describe('automations API', function () {
  const createApi = (
    overrides: Partial<
      Parameters<typeof createAutomationsApi2<TestAutomationsRepositoryConnection>>[0]
    > = {},
  ) =>
    createAutomationsApi2({
      repository: createTestAutomationsRepository2(),
      ...overrides,
    });

  describe('alphabetical key order', function () {
    it('keeps its keys in alphabetical order for consistency', function () {
      const api = createApi();

      const actual = Object.keys(api);
      const expected = actual.toSorted();

      expect(actual).toEqual(expected);
    });
  });

  describe('getNumberOfAutomations', function () {
    it('returns the number of automations', async function () {
      const repository = createTestAutomationsRepository2({
        getNumberOfAutomations: () => 123,
      });
      const api = createApi({ repository });

      await expect(api.getNumberOfAutomations()).resolves.toBe(123);
    });
  });
});
