import { noop } from 'lodash';
import { createAutomationsApi2 } from '../../../../../core/server/services/automations/automations-api-2';
import { StartAutomationsPollEvent } from '../../../../../core/server/services/automations/events/start-automations-poll-event';
import {
  createTestAutomationsRepository2,
  type TestAutomationsRepositoryConnection,
} from './test-automations-repository-2';

describe('automations API', function () {
  const createTestDomainEvents = () => ({
    dispatch: () => {
      throw new Error('domainEvents.dispatch should not be called');
    },
  });
  const createApi = (
    overrides: Partial<
      Parameters<typeof createAutomationsApi2<TestAutomationsRepositoryConnection>>[0]
    > = {},
  ) =>
    createAutomationsApi2({
      domainEvents: createTestDomainEvents(),
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

  describe('requestPoll', function () {
    it('dispatches a "start automations poll" event', function () {
      const domainEvents = { dispatch: vi.fn() };
      const api = createApi({ domainEvents });

      api.requestPoll();

      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });
  });
});
