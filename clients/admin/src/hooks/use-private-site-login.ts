import { useEffect, useRef } from 'react';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

/**
 * Signs staff into a password-protected site's frontend once per page load, so
 * the View site frame and post previews render instead of the password page.
 */
export function usePrivateSiteLogin() {
  const { data: settingsData } = useBrowseSettings();
  const { data: siteData } = useBrowseSite();
  const settings = settingsData?.settings;
  const siteUrl = siteData?.site.url;
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !settings || !siteUrl) {
      return;
    }
    attempted.current = true;

    const password = getSettingValue<string>(settings, 'password');
    if (getSettingValue<boolean>(settings, 'is_private') !== true || !password) {
      return;
    }

    const loginUrl = new URL('private/?r=%2F', siteUrl.replace(/\/?$/, '/'));
    // eslint-disable-next-line no-restricted-syntax -- signs into the site front-end, not the Admin API
    fetch(loginUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'manual',
      credentials: 'include',
      body: new URLSearchParams({ password }),
    }).catch(() => {
      // Cross-origin frontends reject the response even when the cookie was set,
      // and a blocked cookie only leaves the frontend showing its password page.
    });
  }, [settings, siteUrl]);
}
