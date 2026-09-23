import {
  createRemoteComponentRenderer,
  type RemoteComponentRendererMap,
} from '@remote-dom/react/host';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Label } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
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
    <Stack className="w-full" gap="sm">
      <Label htmlFor={id}>{label}</Label>
      <Stack
        className="w-full rounded-xl border border-border-default bg-surface-elevated p-4"
        gap="md"
      >
        <Inline align="center" gap="md">
          <Icon aria-hidden="true" className="shrink-0 text-muted-foreground" size={20} />
          <Stack className="min-w-0" gap="sm">
            <Text className="break-all" size="sm" weight="medium">
              {url
                ? url.split('/').pop()
                : `Add an ${format === 'audio' ? 'audio' : 'episode video'} file`}
            </Text>
            <Text size="sm" tone="secondary">
              {upload.isLoading
                ? `Uploading ${formatNumber(upload.progress)}%`
                : url
                  ? 'Ready to publish'
                  : format === 'audio'
                    ? 'MP3, M4A, WAV or OGG'
                    : 'MP4, WebM or OGV'}
            </Text>
          </Stack>
        </Inline>
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
        <Inline gap="sm">
          <Button
            disabled={upload.isLoading}
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {url ? 'Replace file' : `Upload ${format}`}
          </Button>
          {url ? (
            <Button
              disabled={upload.isLoading}
              size="sm"
              variant="ghost"
              onClick={() => run(Promise.resolve(onChange?.(null)))}
            >
              Remove file
            </Button>
          ) : null}
        </Inline>
      </Stack>
      {error || upload.errors.length ? (
        <Text className="text-destructive" size="sm">
          {error || upload.errors[0]?.message}
        </Text>
      ) : null}
    </Stack>
  );
}

export const ADDON_EDITOR_SETTINGS_COMPONENTS: RemoteComponentRendererMap = new Map([
  ['gh-media-upload', createRemoteComponentRenderer(SettingsMediaUpload)],
]);
