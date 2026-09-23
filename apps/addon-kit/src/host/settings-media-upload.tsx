import {
  createRemoteComponentRenderer,
  type RemoteComponentRendererMap,
} from '@remote-dom/react/host';
import { forwardRef, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Button, Label } from '@tryghost/shade/components';
import { Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useKoenigFileUpload } from '@tryghost/admin-x-framework/hooks';
import type { GhMediaReference, GhMediaUploadProperties } from '../editor-settings/elements.ts';

/** Bytes and authenticated upload requests remain in the host. */
export function SettingsMediaUpload({
  label,
  format = 'audio',
  url,
  onChange,
}: GhMediaUploadProperties & { onChange?: (value: GhMediaReference | null) => Promise<void> }) {
  const id = useId();
  const upload = useKoenigFileUpload(format, { sessionExpiryRedirect: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = format === 'audio' ? LucideIcon.Headphones : LucideIcon.Video;
  const [error, setError] = useState('');
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = (work: Promise<unknown>) => {
    setError('');
    void work.catch((failure: unknown) => {
      if (active.current) {
        const details =
          failure && typeof failure === 'object' ? (failure as Record<string, unknown>) : {};
        const message =
          typeof details.context === 'string' && details.context
            ? details.context
            : details.message;
        setError(typeof message === 'string' && message ? message : 'Could not update this media.');
      }
    });
  };
  const uploadFile = async (file: File) => {
    const mimeByExtension: Record<string, string> = {
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      ogg: format === 'audio' ? 'audio/ogg' : 'video/ogg',
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogv: 'video/ogg',
    };
    const mime = mimeByExtension[file.name.split('.').pop()?.toLowerCase() ?? ''];
    if (!mime?.startsWith(`${format}/`)) {
      throw new Error('Unsupported media format');
    }
    const result = await upload.upload([file], { throwOnError: true });
    if (!result?.[0]?.url) {
      throw new Error('Upload returned no media');
    }
    if (active.current) {
      await onChange?.({ url: result[0].url, mime_type: mime, byte_length: file.size });
    }
  };
  return (
    <Stack className="w-full min-w-0" gap="sm">
      <Label htmlFor={id}>{label}</Label>
      <Inline
        align="center"
        className="min-w-0 rounded-lg border border-border-default bg-surface-elevated px-3 py-2"
        gap="sm"
      >
        {url && <Icon aria-hidden="true" className="shrink-0 text-muted-foreground" size={16} />}
        {(url || upload.isLoading) && (
          <Text
            className="min-w-0 flex-1 truncate"
            size="sm"
            title={url?.split('/').pop()}
            tone={url ? 'primary' : 'secondary'}
          >
            {upload.isLoading
              ? `Uploading ${formatNumber(upload.progress)}%`
              : url?.split('/').pop()}
          </Text>
        )}
        <input
          ref={inputRef}
          accept={`${format}/*`}
          className="sr-only"
          disabled={upload.isLoading}
          id={id}
          tabIndex={-1}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              run(uploadFile(file));
            }
            event.target.value = '';
          }}
        />
        {(url || !upload.isLoading) && (
          <Button
            aria-label={`${url ? 'Replace' : 'Upload'} ${label?.toLowerCase() || format}`}
            className={url ? 'shrink-0' : 'w-full justify-start text-muted-foreground'}
            disabled={upload.isLoading}
            size={url ? 'icon-sm' : 'sm'}
            variant="ghost"
            onClick={() => inputRef.current?.click()}
          >
            {url ? (
              <LucideIcon.Replace aria-hidden="true" size={14} />
            ) : (
              <>
                <Icon aria-hidden="true" size={16} />
                Upload file
              </>
            )}
          </Button>
        )}
        {url && (
          <Button
            aria-label={`Remove ${label?.toLowerCase() || format}`}
            className="shrink-0"
            disabled={upload.isLoading}
            size="icon-sm"
            variant="ghost"
            onClick={() => run(Promise.resolve(onChange?.(null)))}
          >
            <LucideIcon.X aria-hidden="true" size={14} />
          </Button>
        )}
      </Inline>
      {error || upload.errors.length ? (
        <Text className="text-destructive" size="sm">
          {error || upload.errors[0]?.message}
        </Text>
      ) : null}
    </Stack>
  );
}

export const ADDON_EDITOR_SETTINGS_COMPONENTS: RemoteComponentRendererMap = new Map([
  [
    'gh-media-upload',
    createRemoteComponentRenderer(
      forwardRef(function MediaUpload(props: Parameters<typeof SettingsMediaUpload>[0], _ref) {
        return <SettingsMediaUpload {...props} />;
      }),
    ),
  ],
  [
    'gh-editor-row',
    createRemoteComponentRenderer(
      forwardRef<HTMLDivElement, { children?: ReactNode }>(function EditorRow({ children }, ref) {
        return (
          <Grid ref={ref} className="w-full min-w-0" columns={2} gap="md">
            {children}
          </Grid>
        );
      }),
    ),
  ],
]);
