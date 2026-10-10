import { Suspense, forwardRef, lazy, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { lazyDesignPanel } from '@/settings/api';
import { VIEW_SITE_PATH, useCanCustomizeSite, useIsCustomizingSite } from './customize';

const DesignPanel = lazy(lazyDesignPanel);

// The site frame's own parameters, on top of the page it shows
const FRAME_PARAMS = ['v', 'admin', 'admin_toolbar'];

function homepageUrl(siteUrl: string): string {
  return new URL(siteUrl.replace(/\/?$/, '/')).href;
}

function siteFrameUrl(pageUrl: string, version: number): string {
  const url = new URL(pageUrl);
  url.searchParams.set('v', String(version));
  url.searchParams.set('admin', '1');
  url.searchParams.set('admin_toolbar', '0');
  return url.href;
}

/**
 * The page the site frame is on, without the frame's own parameters, or
 * undefined where it can't be read: not loaded yet, or on another origin than
 * the admin.
 */
function framePage(frame: HTMLIFrameElement | null): string | undefined {
  try {
    const href = frame?.contentWindow?.location.href;
    if (!href || href === 'about:blank') {
      return undefined;
    }
    const url = new URL(href);
    FRAME_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.href;
  } catch {
    return undefined;
  }
}

const SiteFrame = forwardRef<HTMLIFrameElement, { pageUrl: string }>(function SiteFrame(
  { pageUrl },
  ref,
) {
  const [src] = useState(() => siteFrameUrl(pageUrl, Date.now()));

  return (
    <iframe
      ref={ref}
      className="absolute inset-0 size-full border-0"
      data-view-site-preview=""
      src={src}
      title="Site preview"
    />
  );
});

/**
 * Which site frame shows: a new one, on the homepage, per navigation to View
 * site, so clicking View site again returns to it; and a new one on the page
 * being customized after a save, so it shows the saved design. Opening or
 * closing Customize changes the URL too, but keeps the frame (and its page).
 */
function useSiteFrame(customizing: boolean) {
  const { key } = useLocation();
  const [frame, setFrame] = useState<{
    key: string;
    customizing: boolean;
    version: number;
    pageUrl?: string;
  }>({ key, customizing, version: 0 });

  if (frame.key !== key) {
    const revisited = frame.customizing === customizing;
    setFrame(
      revisited ? { key, customizing, version: frame.version + 1 } : { ...frame, key, customizing },
    );
  }

  const reloadAt = (pageUrl: string) =>
    setFrame((current) => ({ ...current, version: current.version + 1, pageUrl }));
  return { version: frame.version, pageUrl: frame.pageUrl, reloadAt };
}

const ViewSite = () => {
  const { data } = useBrowseSite();
  const navigate = useNavigate();
  const canCustomize = useCanCustomizeSite();
  const customizing = useIsCustomizingSite() && canCustomize;
  const frame = useSiteFrame(customizing);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const siteUrl = data?.site.url;

  // Customize previews the page the site is on as it opens
  const [customizedPage, setCustomizedPage] = useState<string>();
  useLayoutEffect(() => {
    if (customizing && siteUrl) {
      setCustomizedPage(framePage(frameRef.current) ?? homepageUrl(siteUrl));
    } else {
      setCustomizedPage(undefined);
    }
  }, [customizing, siteUrl]);

  if (!siteUrl) {
    return null;
  }

  return (
    <div className="relative size-full">
      <SiteFrame
        key={frame.version}
        ref={frameRef}
        pageUrl={frame.pageUrl ?? homepageUrl(siteUrl)}
      />
      {customizing && customizedPage && (
        <Suspense fallback={null}>
          <DesignPanel
            livePageUrl={() => framePage(frameRef.current)}
            openParam="customize"
            pageUrl={customizedPage}
            onClose={() => navigate(VIEW_SITE_PATH, { replace: true })}
            // Under the preview, the site catches up with the saved design
            onSaved={frame.reloadAt}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ViewSite;
