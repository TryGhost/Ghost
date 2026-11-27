import { getHashtagPath } from '@src/utils/hashtags';
import { useAppBasePath } from './use-app-base-path';
import { useCallback } from 'react';
import { useHref } from 'react-router';

/**
 * Hook that returns a function building the in-app URL of a hashtag's feed,
 * the same one a click on the hashtag navigates to, for links that should
 * also work when opened in a new tab
 */
export function useHashtagHref() {
  const basePath = useAppBasePath();
  const appHref = useHref(`${basePath}/`);

  return useCallback((name: string) => `${appHref.replace(/\/$/, '')}${getHashtagPath(name)}`, [appHref]);
}
