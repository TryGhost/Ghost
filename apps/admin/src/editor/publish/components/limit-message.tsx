import { upgradeRoute, useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { EDITOR_QUERY_OPTIONS } from '@/editor/publish/request-options';
import type { LimitMessagePart } from '@/editor/publish/publish-options';

/** Renders a host limit message, linking the upgrade phrase without injecting markup. */
export function LimitMessage({ parts }: { parts: LimitMessagePart[] }) {
  const { data: configData } = useBrowseConfig(EDITOR_QUERY_OPTIONS);
  const route = upgradeRoute(configData?.config);

  return (
    <>
      {parts.map((part) =>
        part.kind === 'upgrade' ? (
          <a key={`${part.kind}:${part.text}`} className="underline" href={`#${route}`}>
            {part.text}
          </a>
        ) : (
          <span key={`${part.kind}:${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
