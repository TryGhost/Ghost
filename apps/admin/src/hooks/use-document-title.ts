import { useEffect } from 'react';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

export function useDocumentTitle() {
  const { data } = useBrowseSite({ defaultErrorHandler: false });
  const siteTitle = data?.site.title;

  useEffect(() => {
    if (siteTitle !== undefined) {
      document.title = `Ghost Admin - ${siteTitle}`;
    }
  }, [siteTitle]);
}
