import { Badge } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { Link } from '@tryghost/admin-x-framework';
import { useSettingsReturnToState } from '@/layout/settings-navigation';

const DEFAULT_SITE_ICON = 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png';

/** The site's title and icon (Ghost's orb when it has none). */
function useSiteIdentity(): { title: string; icon: string } {
  const site = useBrowseSite();
  return {
    title: site.data?.site.title ?? '',
    icon: site.data?.site.icon ?? DEFAULT_SITE_ICON,
  };
}

/** The site icon for the floating sidebar, which sizes and crops it; the circle around it carries the name. */
export function SidebarSiteIcon() {
  const { icon } = useSiteIdentity();
  return <img alt="" className="size-full object-cover" draggable={false} src={icon} />;
}

interface SidebarSiteIdentityProps {
  /**
   * `capsule`: beside the icon in the floating sidebar's header row: the
   * title and badge only, the title truncating to fit.
   * `header`: the docked sidebar's (or mobile sheet's) header row, icon included.
   */
  variant: 'capsule' | 'header';
}

/** The site title and, for a private site, a Private badge linking to its access settings. */
export function SidebarSiteIdentity({ variant }: SidebarSiteIdentityProps) {
  const settings = useBrowseSettings();
  const { title, icon: siteIcon } = useSiteIdentity();
  const isPrivate = getSettingValue<boolean>(settings.data?.settings, 'is_private') ?? false;
  const settingsReturnToState = useSettingsReturnToState();

  const privateBadge = isPrivate && (
    <Link
      aria-label="Open access settings"
      className="shrink-0"
      state={settingsReturnToState}
      to="/settings/members"
    >
      <Badge
        className="gap-1 border-transparent bg-orange-100 px-1.5 py-0 text-[11px] leading-5 font-semibold text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500/30"
        variant="secondary"
      >
        <LucideIcon.Lock className="size-3" strokeWidth={2.25} />
        Private
      </Badge>
    </Link>
  );

  if (variant === 'capsule') {
    return (
      <>
        <span className="heading-font-features min-w-0 truncate text-[18px] leading-[1.15] font-medium tracking-[-0.01em] whitespace-nowrap text-foreground">
          {title}
        </span>
        {privateBadge}
      </>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="size-8 flex-shrink-0 rounded-md border-0 bg-transparent">
        <img alt="Site icon" className="size-full rounded-md object-cover" src={siteIcon} />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="heading-font-features min-w-0 truncate text-lg font-semibold text-foreground">
          {title}
        </div>
        {privateBadge}
      </div>
    </div>
  );
}
