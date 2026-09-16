import GlobalDataProvider from './global-data-provider';
import useSearchService from '@/settings/utils/search';
import { type ReactNode, useState } from 'react';
import { ScrollSectionProvider } from '@/settings/hooks/scroll-section-provider';
import { SettingsAppContext, type Sorting, type UpgradeStatusType } from './settings-app-context';
import { officialThemes } from '@/settings/data/official-themes';
import { zapierTemplates } from '@/settings/data/zapier-templates';

type SettingsAppProviderProps = { upgradeStatus?: UpgradeStatusType; children: ReactNode };

const SettingsAppProvider: React.FC<SettingsAppProviderProps> = ({ children, upgradeStatus }) => {
  const search = useSearchService();

  // a few sane defaults for keeping a sorting state
  const [sortingState, setSortingState] = useState<Sorting[]>([
    {
      type: 'offers',
      option: 'date-added',
      direction: 'desc',
    },
  ]);

  const [offersShowArchived, setOffersShowArchived] = useState(false);

  return (
    <SettingsAppContext.Provider
      value={{
        officialThemes,
        zapierTemplates,
        upgradeStatus,
        search,
        sortingState,
        setSortingState,
        offersShowArchived,
        setOffersShowArchived,
      }}
    >
      <GlobalDataProvider>
        <ScrollSectionProvider>{children}</ScrollSectionProvider>
      </GlobalDataProvider>
    </SettingsAppContext.Provider>
  );
};

export default SettingsAppProvider;
