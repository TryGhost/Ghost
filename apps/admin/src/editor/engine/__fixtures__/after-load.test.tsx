import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { koenigFileUploadTypes } from '@tryghost/admin-x-framework/hooks';
import { KoenigComposer, KoenigEditor } from '@tryghost/koenig-lexical';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import { stripDirection, type LexicalDocument } from '@/editor/engine/lexical-compare';

interface EditorApi {
  editorInstance: {
    update(fn: () => void, options: { discrete: boolean }): void;
    getEditorState(): { toJSON(): LexicalDocument };
  };
}

const fileUploader = {
  useFileUpload: () => ({
    progress: 0,
    isLoading: false,
    errors: [],
    filesNumber: 0,
    upload: () => Promise.resolve(null),
  }),
  fileTypes: koenigFileUploadTypes,
};

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

// Render the same hidden Koenig instance that supplies the change tracker's normalization baseline.
async function loadThroughKoenig(before: LexicalDocument): Promise<LexicalDocument> {
  let api: EditorApi | undefined;

  render(
    <KoenigComposer
      cardConfig={{}}
      fileUploader={fileUploader}
      initialEditorState={JSON.stringify(before)}
      isTKEnabled={true}
    >
      <KoenigEditor
        registerAPI={(registered: EditorApi) => {
          api = registered;
        }}
      />
    </KoenigComposer>,
  );

  await act(tick);
  if (!api) {
    throw new Error('Koenig did not register its API');
  }
  const { editorInstance } = api;
  await act(async () => {
    editorInstance.update(() => {}, { discrete: true });
    await tick();
  });

  return editorInstance.getEditorState().toJSON();
}

// `direction` is inferred by the reconciler and differs between jsdom, a real
// browser, and a headless parse; the comparator strips it, so this does too.
describe('old-schema corpus freshness', () => {
  afterEach(cleanup);

  it.each(OLD_SCHEMA_CORPUS)(
    '$name loads to its recorded after state',
    async ({ before, after }) => {
      const loaded = await loadThroughKoenig(before);

      expect(stripDirection(loaded.root)).toEqual(stripDirection(after.root));
    },
  );
});
