import { useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

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
    <div className="relative size-full">
      <iframe
        className="absolute inset-0 size-full border-0"
        data-view-site-preview=""
        src={src}
        title="Site preview"
      />
    </div>
  );
}

const ViewSite = () => {
  const { data } = useBrowseSite();
  // A new frame per navigation, so clicking View site again returns to the
  // homepage.
  const { key } = useLocation();
  const siteUrl = data?.site.url;

  if (!siteUrl) {
    return null;
  }

  return <SiteFrame key={key} siteUrl={siteUrl} />;
};

export default ViewSite;
