import { Button } from '@tryghost/shade/components';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useStopContentCSVImport } from '@tryghost/admin-x-framework/api/posts';
import { useQueryClient } from '@tryghost/admin-x-framework';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { toast } from 'sonner';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { importPercentage, importProgressLabel, type TrackedImport } from './progress';
import { useImportProgress } from './use-import-progress';

function ProgressCard({ progress }: { progress: TrackedImport }) {
  const percentage = importPercentage(progress);
  const { data: config } = useBrowseConfig();
  const { mutateAsync: stopImport, isPending } = useStopContentCSVImport();
  const { confirm } = useConfirmation();
  const client = useQueryClient();
  const handleError = useHandleError();
  const canStop =
    config?.config.contentImport?.cancellation &&
    (progress.status === 'queued' || progress.status === 'running');
  const requestStop = () => {
    confirm({
      title: 'Stop this import?',
      prompt:
        'Already imported posts and pages will be kept. Remaining rows will not be imported. You’ll receive an email with the partial results.',
      cancelLabel: 'Keep importing',
      okLabel: 'Stop import',
      okRunningLabel: 'Stopping…',
      okVariant: 'destructive',
      onOk: async (modal) => {
        try {
          await stopImport(progress.import_id);
          modal?.remove();
        } catch (error) {
          if (error instanceof APIError && error.response?.status === 409) {
            modal?.remove();
            toast.info('This import has already finished processing.');
          } else {
            handleError(error);
          }
        } finally {
          await client.invalidateQueries({ queryKey: ['ContentCSVProgress'] });
        }
      },
    });
  };
  const description = progress.stale
    ? 'Progress is temporarily unavailable. Your import may still be running.'
    : progress.status === 'cancelling'
      ? 'Stopping your import and preparing your partial report. Already imported content will be kept.'
      : progress.status === 'queued'
        ? 'Your import is queued. You can leave this page while it waits to start.'
        : progress.status === 'finalizing'
          ? 'Finishing your import and preparing your completion email.'
          : 'Importing your content. You can leave this page while the import runs in the background.';

  return (
    <Box className="border border-border-default" padding="lg" radius="xl">
      <Stack gap="md">
        <Inline align="center" gap="lg" justify="between">
          <Stack gap="xs">
            <Text as="h3" size="lg" weight="semibold">
              Import progress
            </Text>
            <Text tone="secondary">{description}</Text>
          </Stack>
          <Text className="shrink-0 tabular-nums" size="2xl" weight="semibold">
            {importProgressLabel(progress)}
          </Text>
        </Inline>
        <Box
          aria-label="Import progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percentage ?? undefined}
          aria-valuetext={importProgressLabel(progress)}
          className="h-2 overflow-hidden bg-muted"
          radius="full"
          role="progressbar"
        >
          <Box
            className={`h-full bg-foreground motion-safe:transition-[width] ${percentage === null ? 'motion-safe:animate-pulse' : ''}`}
            radius="full"
            style={{ width: `${percentage ?? 33}%` }}
          />
        </Box>
        {canStop && (
          <Inline justify="end">
            <Button disabled={isPending} size="sm" variant="outline" onClick={requestStop}>
              Stop import
            </Button>
          </Inline>
        )}
      </Stack>
    </Box>
  );
}

export function ImportProgressCards() {
  const { imports } = useImportProgress();
  if (!imports.length) {
    return null;
  }
  return (
    <Stack className="pt-4" gap="md">
      {imports.map((progress) => (
        <ProgressCard key={progress.import_id} progress={progress} />
      ))}
    </Stack>
  );
}
