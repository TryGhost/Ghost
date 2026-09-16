import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { settingsLoadError } from '@tryghost/test-data/selectors/editor';

export interface SectionLoadErrorProps {
  /** A whole sentence naming what could not be loaded. */
  message: string;
  onRetry: () => void;
}

/**
 * What a settings section shows in place of options a browse failed to fetch:
 * the writer is told, and keeps a way to ask again.
 */
export function SectionLoadError({ message, onRetry }: SectionLoadErrorProps) {
  return (
    <Stack align="start" className="p-2" data-testid={settingsLoadError} gap="sm">
      <Text role="alert" size="sm">
        {message}
      </Text>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </Stack>
  );
}
