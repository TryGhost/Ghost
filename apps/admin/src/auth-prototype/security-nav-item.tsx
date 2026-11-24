import { type ComponentType, type MouseEvent, type ReactNode } from 'react';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { LucideIcon } from '@tryghost/shade/utils';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useAuthPrototypeEnabled } from '@/auth-prototype/enabled';
import { securitySearchKeywords } from './security-keywords';

interface NavItemLikeProps {
  icon?: ReactNode;
  keywords: string[];
  navid: string | string[];
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  title: ReactNode;
}

/** The "Security" item in the Settings sidebar. The sidebar passes its own NavItem in. */
export function SecurityNavItem({
  NavItem,
  onClick,
}: {
  NavItem: ComponentType<NavItemLikeProps>;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const enabled = useAuthPrototypeEnabled();
  const { currentUser } = useGlobalData();

  if (!enabled || !hasAdminAccess(currentUser)) {
    return null;
  }

  return (
    <NavItem
      icon={<LucideIcon.ShieldCheck />}
      keywords={securitySearchKeywords}
      navid="security"
      title="Security"
      onClick={onClick}
    />
  );
}
