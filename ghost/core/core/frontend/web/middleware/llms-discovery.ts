import type * as http from 'node:http';
import onHeaders from 'on-headers';

type SettingsCache = {
  get: (key: 'is_private' | 'llms_enabled') => unknown;
};

function appendHeaderValue(
  existingValue: http.OutgoingHttpHeader | undefined,
  newValue: string,
): string {
  if (!existingValue) {
    return newValue;
  }

  const raw = Array.isArray(existingValue) ? existingValue : [String(existingValue)];
  const values = raw.flatMap((value) => value.split(',').map((part) => part.trim()));

  if (values.includes(newValue)) {
    return raw.join(', ');
  }

  return raw.concat(newValue).join(', ');
}

export function createLlmsDiscovery({ settingsCache }: { settingsCache: SettingsCache }) {
  function isDiscoveryEnabled() {
    return !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
  }

  return function llmsDiscovery(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => unknown,
  ) {
    if (!isDiscoveryEnabled()) {
      return next();
    }

    onHeaders(res, function addLlmsDiscoveryHeaders() {
      if (!isDiscoveryEnabled()) {
        return;
      }

      const linkHeader = appendHeaderValue(this.getHeader('Link'), '</llms.txt>; rel="llms-txt"');
      this.setHeader(
        'Link',
        appendHeaderValue(linkHeader, '</llms-full.txt>; rel="llms-full-txt"'),
      );

      if (!this.getHeader('X-Llms-Txt')) {
        this.setHeader('X-Llms-Txt', '/llms.txt');
      }
    });

    next();
  };
}
