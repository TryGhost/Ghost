import { Suspense, useCallback, useMemo } from 'react';
import { LoadingIndicator } from '@tryghost/shade/components';
import { koenigFileUploadTypes, useKoenigFileUpload } from '@tryghost/admin-x-framework/hooks';
import ErrorBoundary from '@/settings/components/error-boundary';
import {
  type EditorResource,
  type KoenigInstance,
  loadKoenig,
} from '@/settings/components/koenig-loader';
import type { PostCardConfig } from './card-config';
import { reportKoenigError } from './koenig-error';

const fileUploader = {
  useFileUpload: useKoenigFileUpload,
  fileTypes: koenigFileUploadTypes,
};

const NOOP = () => {};

export interface KoenigPostEditorProps {
  initialLexical: string | null;
  placeholder: string;
  cardConfig: PostCardConfig;
  darkMode: boolean;
  cursorDidExitAtTop?: () => void;
  onChange?: (lexical: unknown) => void;
  onSecondaryChange?: (lexical: unknown) => void;
  /** The hidden instance failed, so its serialization cannot be a change baseline. */
  onSecondaryError?: (error: unknown) => void;
  registerAPI: (api: KoenigInstance | null) => void;
  registerSecondaryAPI: (api: KoenigInstance | null) => void;
  onWordCountChange: (count: number) => void;
  onTkCountChange: (count: number) => void;
}

interface KoenigInstanceMountProps extends KoenigPostEditorProps {
  editor: EditorResource;
  isSecondary: boolean;
  onError: (error: unknown) => void;
}

// The hidden secondary instance loads the same initial state: Koenig normalises
// documents on load, so its output is the baseline change detection compares against
function KoenigInstanceMount({
  editor,
  isSecondary,
  onError,
  initialLexical,
  placeholder,
  cardConfig,
  darkMode,
  cursorDidExitAtTop,
  onChange,
  onSecondaryChange,
  registerAPI,
  registerSecondaryAPI,
  onWordCountChange,
  onTkCountChange,
}: KoenigInstanceMountProps) {
  const { KoenigComposer, KoenigEditor, WordCountPlugin, TKCountPlugin } = editor.read();

  return (
    <div
      data-secondary-instance={isSecondary ? 'true' : 'false'}
      data-testid={isSecondary ? 'editor-secondary-instance' : 'editor-body'}
      hidden={isSecondary}
    >
      <KoenigComposer
        cardConfig={cardConfig}
        darkMode={darkMode}
        fileUploader={fileUploader}
        initialEditorState={initialLexical ?? undefined}
        isTKEnabled={true}
        onError={onError}
      >
        <KoenigEditor
          cursorDidExitAtTop={isSecondary ? undefined : cursorDidExitAtTop}
          darkMode={isSecondary ? undefined : darkMode}
          placeholderText={isSecondary ? undefined : placeholder}
          registerAPI={isSecondary ? registerSecondaryAPI : registerAPI}
          onChange={isSecondary ? onSecondaryChange : onChange}
        />
        <WordCountPlugin onChange={isSecondary ? NOOP : onWordCountChange} />
        <TKCountPlugin onChange={isSecondary ? NOOP : onTkCountChange} />
      </KoenigComposer>
    </div>
  );
}

export function KoenigPostEditor(props: KoenigPostEditorProps) {
  const editor = useMemo(() => loadKoenig(), []);
  const { onSecondaryError } = props;

  const onSecondaryInstanceError = useCallback(
    (error: unknown) => {
      reportKoenigError(error);
      onSecondaryError?.(error);
    },
    [onSecondaryError],
  );

  return (
    <div className="koenig-react-editor koenig-lexical mx-auto w-full max-w-[740px]">
      <ErrorBoundary name="the editor">
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <LoadingIndicator size="lg" />
            </div>
          }
        >
          <KoenigInstanceMount
            {...props}
            editor={editor}
            isSecondary={false}
            onError={reportKoenigError}
          />
          <KoenigInstanceMount
            {...props}
            editor={editor}
            isSecondary={true}
            onError={onSecondaryInstanceError}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
