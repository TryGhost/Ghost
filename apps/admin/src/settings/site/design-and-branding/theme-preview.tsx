import IframeBuffering from '@/settings/utils/iframe-buffering';
import React, { useCallback, useRef } from 'react';
import { cn } from '@tryghost/shade/utils';
import {
  type CustomThemeSetting,
  hiddenCustomThemeSettingValue,
} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { followPreviewLinks } from './preview-navigation';
import { isCustomThemeSettingVisible } from '@/settings/utils/is-custom-theme-settings-visible';

type GlobalSettings = {
  description: string;
  accentColor: string;
  icon: string;
  logo: string;
  coverImage: string;
  themeSettings?: Array<CustomThemeSetting & { dirty?: boolean }>;
  bodyFont: string;
  headingFont: string;
};

interface ThemePreviewProps {
  settings: GlobalSettings;
  url: string;
  // Hidden previews stay mounted and laid out, so revealing one needs no reflow.
  isVisible?: boolean;
  /**
   * Shrinks the page to fit more of it in (the Design modal's preview pane).
   * Off, it renders at the size it would on the site, e.g. in place of it.
   */
  scaled?: boolean;
  /**
   * Makes the preview browsable: clicking one of the site's links asks for
   * that page (to preview in turn). Without it, the preview ignores the pointer.
   */
  onNavigate?: (url: string) => void;
}

function getPreviewData({
  description,
  accentColor,
  icon,
  logo,
  coverImage,
  themeSettings,
  bodyFont,
  headingFont,
}: {
  description: string;
  accentColor: string;
  icon: string;
  logo: string;
  coverImage: string;
  themeSettings?: Array<CustomThemeSetting & { dirty?: boolean }>;
  bodyFont: string;
  headingFont: string;
}) {
  // Don't render twice while theme settings are loading
  if (!themeSettings) {
    return;
  }
  const themeSettingsKeyValueObj = themeSettings.reduce(
    (obj, { key, value }) => ({ ...obj, [key]: value }),
    {},
  );

  const params = new URLSearchParams();
  params.append('c', accentColor);
  params.append('d', description);
  params.append('icon', icon);
  params.append('logo', logo);
  params.append('cover', coverImage);
  params.append('bf', bodyFont);
  params.append('hf', headingFont);
  const custom: {
    [key: string]: string | typeof hiddenCustomThemeSettingValue;
  } = {};
  themeSettings.forEach((setting) => {
    custom[setting.key] = isCustomThemeSettingVisible(setting, themeSettingsKeyValueObj)
      ? (setting.value as string)
      : hiddenCustomThemeSettingValue;
  });
  params.append('custom', JSON.stringify(custom));

  return params.toString();
}

const ThemePreview: React.FC<ThemePreviewProps> = ({
  settings,
  url,
  isVisible = true,
  scaled = true,
  onNavigate,
}) => {
  const previewData = getPreviewData({ ...settings });
  const browsable = Boolean(onNavigate);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  // Only the latest request writes: an earlier one can answer after it
  const latestRequest = useRef(0);

  const injectContentIntoIframe = useCallback(
    (iframe: HTMLIFrameElement) => {
      if (!url || !previewData) {
        return;
      }

      // Fetch theme preview HTML (suppress admin toolbar in preview)
      const previewUrl = new URL(url);
      previewUrl.searchParams.set('admin_toolbar', '0');
      latestRequest.current += 1;
      const request = latestRequest.current;

      // eslint-disable-next-line no-restricted-syntax -- posts preview data to the site front-end, not the Admin API
      void fetch(previewUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'x-ghost-preview': previewData,
          Accept: 'text/html',
        },
        mode: 'cors',
        credentials: 'include',
      })
        .then((response) => response.text())
        .then((data) => {
          if (request !== latestRequest.current) {
            return;
          }

          const domParser = new DOMParser();
          const htmlDoc = domParser.parseFromString(data, 'text/html');

          // Browsable, its relative links and assets resolve against the page
          // it shows; otherwise, extra CSS disables navigation and clicks
          if (browsable && !htmlDoc.querySelector('base')) {
            const base = htmlDoc.createElement('base');
            base.href = url;
            htmlDoc.head.prepend(base);
          }
          if (!browsable) {
            const injectedCss = `html { pointer-events: none; }`;
            const stylesheet = htmlDoc.querySelector('style') as HTMLStyleElement;
            const originalCSS = stylesheet?.innerHTML;
            if (originalCSS) {
              stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;
            } else {
              htmlDoc.head.innerHTML += `<style>${injectedCss}</style>`;
            }
          }

          // replace the iframe contents with the doctored preview html
          const doctype = htmlDoc.doctype
            ? new XMLSerializer().serializeToString(htmlDoc.doctype)
            : '';
          const finalDoc = doctype + htmlDoc.documentElement.outerHTML;

          // Send the data to the iframe's window using postMessage
          // Inject the received content into the iframe
          iframe.contentDocument?.open();
          iframe.contentDocument?.write(finalDoc);
          iframe.contentDocument?.close();

          if (browsable && iframe.contentDocument) {
            followPreviewLinks(iframe.contentDocument, url, (next) =>
              onNavigateRef.current?.(next),
            );
          }
        });
    },
    [browsable, previewData, url],
  );

  return (
    <IframeBuffering
      addDelay={false}
      className={cn(
        'absolute bg-white',
        scaled
          ? '-top-px -left-px size-[calc(110%_+_3px)] origin-top-left scale-[.90909] max-[1600px]:size-[calc(130%_+_3px)] max-[1600px]:scale-[.76923]'
          : 'inset-0 size-full',
      )}
      generateContent={injectContentIntoIframe}
      height="100%"
      parentClassName={`absolute inset-0 overflow-hidden ${isVisible ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
      scrollResetKey={browsable ? url : undefined}
      testId="theme-preview"
      width="100%"
    />
  );
};

export default ThemePreview;
