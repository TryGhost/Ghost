import ImportAccount from './import-account';
import Layout from '@src/components/layout';
import React from 'react';
import { H2 } from '@tryghost/shade/primitives';

const AccountMigration: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
        <div className="flex items-center justify-between gap-8">
          <H2>Account migration</H2>
        </div>

        <ImportAccount />
      </div>
    </Layout>
  );
};

export default AccountMigration;
