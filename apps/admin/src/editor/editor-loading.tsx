import { LoadingIndicator } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

/** The editor's loading state, kept outside the lazy editor chunk so the gate can show it too. */
export function EditorLoading() {
  const screenTransitions = useFeatureFlag('admin7ScreenTransitions', {
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  return (
    <Stack
      align="center"
      className={screenTransitions ? 'delayed-fade-in h-full' : 'h-full'}
      justify="center"
    >
      <LoadingIndicator size="lg" />
    </Stack>
  );
}
