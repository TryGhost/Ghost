import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { importPercentage, importProgressLabel, type TrackedImport } from './progress';
import { useImportProgress } from './use-import-progress';

function ProgressCard({ progress }: { progress: TrackedImport }) {
  const percentage = importPercentage(progress);
  const description = progress.stale
    ? 'Progress is temporarily unavailable. Your import may still be running.'
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
