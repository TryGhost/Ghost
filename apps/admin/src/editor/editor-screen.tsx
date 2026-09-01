import { AdminLink } from '@/shared/admin-link';
import { useParams } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';

/**
 * Placeholder for the React editor, served behind the `editorReact` Labs
 * flag. It only proves the EditorGate cutover seam end to end; the editor
 * itself still lives in Ember while the flag is off.
 */
export default function EditorScreen() {
  const editorPath = useParams()['*'];
  const isPage = editorPath?.split('/')[0] === 'page';
  const listPath = isPage ? '/pages' : '/posts';
  const listLabel = isPage ? 'Back to pages' : 'Back to posts';

  return (
    <Stack
      align="center"
      className="h-full px-6 text-center"
      data-testid="editor-react-placeholder"
      justify="center"
    >
      <Text className="max-w-lg" size="sm" tone="secondary">
        The React editor is under construction. Turn off the “React editor” flag in Labs to use the
        editor.
      </Text>
      <Button variant="outline" asChild>
        <AdminLink to={listPath}>{listLabel}</AdminLink>
      </Button>
    </Stack>
  );
}
