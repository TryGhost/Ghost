import { useEffect, useRef } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';

export function ClientExtensionScript() {
  const { data } = useBrowseConfig();
  const extension = data?.config.clientExtensions?.script;
  const src = typeof extension?.src === 'string' ? extension.src : '';
  const hostRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    // StrictMode replays this effect; a second script element would run the script again.
    if (!src || !hostRef.current || injected.current) {
      return;
    }
    injected.current = true;
    const script = document.createElement('script');
    script.src = src;
    hostRef.current.appendChild(script);
  }, [src]);

  if (!src) {
    return null;
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: extension?.container ?? '' }}
      ref={hostRef}
      className="contents"
    />
  );
}
