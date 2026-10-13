import type { AutomationsRepository2 } from './automations-repository-2';

/**
 * A collection of various automations operations.
 *
 * Logic should primarily live here, not in repositories.
 *
 * NOTE: `createAutomationsApi2` will soon replace the existing automations API. See NY-1704.
 */
export const createAutomationsApi2 = <RepositoryTransaction>({
  repository,
}: Readonly<{
  repository: AutomationsRepository2<RepositoryTransaction>;
}>) => {
  return {
    getNumberOfAutomations: (): Promise<number> =>
      repository.withConnection(
        async (connection) => await repository.getNumberOfAutomations(connection),
      ),
  };
};
