import { LoadingIndicator } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';

/** The editor's loading state, kept outside the lazy editor chunk so the gate can show it too. */
export function EditorLoading() {
  return (
    <Stack align="center" className="delayed-fade-in h-full" justify="center" role="status">
      <LoadingIndicator size="lg" />
      <span className="sr-only">Loading editor</span>
    </Stack>
  );
}
