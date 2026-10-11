import React from 'react';
import { Button, Kbd, SidebarHeader } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useOpenGlobalSearch } from '@/global-search/global-search-context';
import { searchShortcutLabel } from '@/global-search/search-shortcut';
import { SidebarSiteIdentity } from './sidebar-site-identity';

interface AppSidebarHeaderProps extends React.ComponentProps<typeof SidebarHeader> {
  /** The floating sidebar shows the site identity in its own header row instead. */
  showSiteIdentity?: boolean;
}

function AppSidebarHeader({ showSiteIdentity = true, ...props }: AppSidebarHeaderProps) {
  const { data: currentUser } = useCurrentUser();
  const showSearch = currentUser && !isContributorUser(currentUser);
  const openGlobalSearch = useOpenGlobalSearch();

  return (
    <SidebarHeader {...props}>
      <div className="flex flex-col items-stretch gap-5">
        {showSiteIdentity && (
          <div className="flex items-center justify-between">
            <SidebarSiteIdentity variant="header" />
          </div>
        )}
        {showSearch && (
          <Button
            className="flex h-(--control-height) items-center justify-between rounded-full border-transparent bg-white pr-2 text-base text-muted-foreground shadow-xs hover:bg-background hover:text-gray-700 hover:shadow-sm dark:border-gray-900/50 dark:bg-gray-900/30 dark:hover:border-gray-900/80 dark:hover:text-gray-400 [&_svg]:stroke-2"
            variant="outline"
            onClick={openGlobalSearch ?? undefined}
          >
            <div className="flex items-center gap-2">
              <LucideIcon.Search className="text-muted-foreground" />
              Search site
            </div>
            <Kbd
              className="bg-transparent text-gray-500 shadow-none dark:text-gray-800"
              style={{ textShadow: 'none' }}
            >
              {searchShortcutLabel}
            </Kbd>
          </Button>
        )}
      </div>
    </SidebarHeader>
  );
}

export default AppSidebarHeader;
