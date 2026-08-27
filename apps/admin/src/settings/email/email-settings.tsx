import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import MailGun from './mailgun';
import Newsletters from './newsletters';
import React from 'react';
import SearchableSection from '@/settings/components/searchable-section';
import { useNewslettersEnabled } from '@tryghost/admin-x-framework/api/settings';
import { useConfig } from '@/settings/hooks/use-settings-data';
import { searchKeywords } from './search-keywords';

const EmailSettings: React.FC = () => {
  const config = useConfig();
  const hasNewslettersEnabled = useNewslettersEnabled() === true;
  const hasMailgun = hasNewslettersEnabled && !config.mailgunIsConfigured;
  const visibleSearchKeywords = [
    searchKeywords.enableNewsletters,
    ...(hasNewslettersEnabled
      ? [searchKeywords.defaultRecipients, searchKeywords.newsletters]
      : []),
    ...(hasMailgun ? [searchKeywords.mailgun] : []),
  ].flat();

  return (
    <SearchableSection keywords={visibleSearchKeywords} title="Newsletters">
      <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
      {hasNewslettersEnabled && (
        <>
          <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
          <Newsletters keywords={searchKeywords.newsletters} />
          {hasMailgun && <MailGun keywords={searchKeywords.mailgun} />}
        </>
      )}
    </SearchableSection>
  );
};

export default EmailSettings;
