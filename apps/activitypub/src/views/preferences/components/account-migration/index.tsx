import ExportAccount from './export-account';
import ImportAccount from './import-account';
import Layout from '@src/components/layout';
import React from 'react';
import { H2 } from '@tryghost/shade/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tryghost/shade/components';
import { isApiError } from '@src/api/activitypub';
import { useAccountMigrationForUser } from '@hooks/use-activity-pub-queries';

const AccountMigration: React.FC = () => {
  const { error: migrationLoadError } = useAccountMigrationForUser('index');
  // Hide Export when the migration API is unavailable (old backend or non-Owner).
  // While loading there is no error yet, so both tabs stay visible.
  const showExportTab = !(
    isApiError(migrationLoadError) &&
    [401, 403, 404, 405, 501].includes(migrationLoadError.statusCode)
  );

  return (
    <Layout>
      <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
        <div className="flex items-center justify-between gap-8">
          <H2>Account migration</H2>
        </div>
        <p className="mt-3 text-base text-gray-800 dark:text-gray-600">
          {showExportTab
            ? 'Move your followers to this Ghost account, or from this account to somewhere else.'
            : 'Move your followers from another social web account to this Ghost account.'}
        </p>

        <div className="mt-6">
          {showExportTab ? (
            <Tabs defaultValue="import" variant="underline">
              <TabsList>
                <TabsTrigger value="import">Bring followers here</TabsTrigger>
                <TabsTrigger value="export">Move followers away</TabsTrigger>
              </TabsList>

              <TabsContent className="mt-6" value="import">
                <ImportAccount />
              </TabsContent>

              <TabsContent className="mt-6" value="export">
                <ExportAccount />
              </TabsContent>
            </Tabs>
          ) : (
            <ImportAccount />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccountMigration;
