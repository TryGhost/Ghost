import { Suspense, lazy, useState } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { lazyDesignPanel } from '@/settings/api';
import { VIEW_SITE_PATH, useCanCustomizeSite, useIsCustomizingSite } from './customize';

const DesignPanel = lazy(lazyDesignPanel);

function siteFrameUrl(siteUrl: string, version: number): string {
  const url = new URL(siteUrl.replace(/\/?$/, '/'));
  url.searchParams.set('v', String(version));
  url.searchParams.set('admin', '1');
  url.searchParams.set('admin_toolbar', '0');
  return url.href;
}

function SiteFrame({ siteUrl }: { siteUrl: string }) {
  const [src] = useState(() => siteFrameUrl(siteUrl, Date.now()));

  return (
    <iframe
      className="absolute inset-0 size-full border-0"
      data-view-site-preview=""
      src={src}
      title="Site preview"
    />
  );
}

/**
 * Which site frame shows: a new one per navigation to View site, so clicking
 * View site again returns to the homepage, and after a save, so it shows the
 * saved design. Opening or closing Customize changes the URL too, but keeps
 * the frame (and the page it's on).
 */
function useSiteFrameKey(customizing: boolean) {
  const { key } = useLocation();
  const [frame, setFrame] = useState({ key, customizing, version: 0 });

  if (frame.key !== key) {
    const revisited = frame.customizing === customizing;
    setFrame({ key, customizing, version: revisited ? frame.version + 1 : frame.version });
  }

  const reload = () => setFrame((current) => ({ ...current, version: current.version + 1 }));
  return [frame.version, reload] as const;
}

const ViewSite = () => {
  const { data } = useBrowseSite();
  const navigate = useNavigate();
  const canCustomize = useCanCustomizeSite();
  const customizing = useIsCustomizingSite() && canCustomize;
  const [frameKey, reloadFrame] = useSiteFrameKey(customizing);
  const siteUrl = data?.site.url;

  if (!siteUrl) {
    return null;
  }

  return (
    <div className="relative size-full">
      <SiteFrame key={frameKey} siteUrl={siteUrl} />
      {customizing && (
        <Suspense fallback={null}>
          <DesignPanel
            className="absolute inset-y-3 right-3 z-10 w-[400px] motion-safe:animate-[view-site-panel-in_320ms_cubic-bezier(0.16,1,0.3,1)]"
            onClose={() => navigate(VIEW_SITE_PATH, { replace: true })}
            onSaved={reloadFrame}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ViewSite;
