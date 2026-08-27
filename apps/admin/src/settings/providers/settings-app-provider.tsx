import useSearchService from '@/settings/utils/search';
import { type ReactNode, useState } from 'react';
import { ScrollSectionProvider } from '@/settings/hooks/scroll-section-provider';
import { SettingsAppContext, type Sorting } from './settings-app-context';
import { officialThemes } from '@/settings/data/official-themes';
import { zapierTemplates } from '@/settings/data/zapier-templates';

// UI state only (search, sorting, scroll spy); data comes from the framework
// query hooks behind SettingsDataGate.
const SettingsAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
        search,
        sortingState,
        setSortingState,
        offersShowArchived,
        setOffersShowArchived,
      }}
    >
      <ScrollSectionProvider>{children}</ScrollSectionProvider>
    </SettingsAppContext.Provider>
  );
};

export default SettingsAppProvider;
