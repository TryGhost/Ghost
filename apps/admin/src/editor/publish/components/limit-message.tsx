import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { upgradeHrefFromConfig } from './limit-message-helpers';
import type { LimitMessagePart } from '@/editor/publish/publish-options';

/** Renders a host limit message, linking the upgrade phrase without injecting markup. */
export function LimitMessage({ parts }: { parts: LimitMessagePart[] }) {
  const { data: configData } = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const href = upgradeHrefFromConfig(configData);

  return (
    <>
      {parts.map((part) =>
        part.kind === 'upgrade' ? (
          <a key={`${part.kind}:${part.text}`} className="underline" href={href}>
            {part.text}
          </a>
        ) : (
          <span key={`${part.kind}:${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
