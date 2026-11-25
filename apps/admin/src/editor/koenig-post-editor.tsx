import {
  Component,
  createRef,
  type ErrorInfo,
  memo,
  type ReactNode,
  Suspense,
  useCallback,
} from 'react';
import { LoadingIndicator } from '@tryghost/shade/components';
import { editorBody, editorSecondaryInstance } from '@tryghost/test-data/selectors/editor';
import ErrorBoundary from '@/settings/components/error-boundary';
import {
  type EditorResource,
  type KoenigInstance,
  loadKoenig,
} from '@/settings/components/koenig-loader';
import type { PostCardConfig } from './card-config';
import { editorFileUploader } from './koenig-file-uploader';
import { koenigErrorReporters } from './report-error';

const NOOP = () => {};

const primaryErrors = koenigErrorReporters('primary');
const secondaryErrors = koenigErrorReporters('secondary');

export interface KoenigPostEditorProps {
  initialLexical: string | null;
  /** Changes when another copy of the document is loaded: the editor starts over on it. */
  contentKey?: number;
  placeholder: string;
  cardConfig: PostCardConfig;
  darkMode: boolean;
  cursorDidExitAtTop?: () => void;
  onChange?: (lexical: unknown) => void;
  onSecondaryChange?: (lexical: unknown) => void;
  /** The hidden instance failed, so its serialization cannot be a change baseline. */
  onSecondaryError?: () => void;
  registerAPI: (api: KoenigInstance | null) => void;
  onWordCountChange: (count: number) => void;
  /** The selection's word count, or null while nothing is selected. */
  onSelectionWordCountChange: (count: number | null) => void;
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
  onWordCountChange,
  onSelectionWordCountChange,
  onTkCountChange,
}: KoenigInstanceMountProps) {
  const { KoenigComposer, KoenigEditor, WordCountPlugin, SelectionWordCountPlugin, TKCountPlugin } =
    editor.read();

  return (
    <div
      data-secondary-instance={isSecondary ? 'true' : 'false'}
      data-testid={isSecondary ? editorSecondaryInstance : editorBody}
      hidden={isSecondary}
    >
      <KoenigComposer
        cardConfig={cardConfig}
        darkMode={darkMode}
        fileUploader={editorFileUploader}
        initialEditorState={initialLexical ?? undefined}
        isTKEnabled={true}
        onError={onError}
      >
        <KoenigEditor
          cursorDidExitAtTop={isSecondary ? undefined : cursorDidExitAtTop}
          darkMode={isSecondary ? undefined : darkMode}
          placeholderText={isSecondary ? undefined : placeholder}
          registerAPI={isSecondary ? undefined : registerAPI}
          onChange={isSecondary ? onSecondaryChange : onChange}
        />
        <WordCountPlugin onChange={isSecondary ? NOOP : onWordCountChange} />
        {isSecondary ? null : <SelectionWordCountPlugin onChange={onSelectionWordCountChange} />}
        <TKCountPlugin onChange={isSecondary ? NOOP : onTkCountChange} />
      </KoenigComposer>
    </div>
  );
}

/** How many frames a reloaded body waits for its cards before letting go of its height. */
const HOLD_FRAMES = 60;

/**
 * Keeps the body's height while another copy of the document replaces it.
 * The new copy is laid out before Lexical has drawn it, and its cards later
 * still, so a shorter body would pull the pane's scroll position in.
 */
class BodyFrame extends Component<{ contentKey?: number; children: ReactNode }> {
  private readonly frame = createRef<HTMLDivElement>();
  private request = 0;

  getSnapshotBeforeUpdate(previous: Readonly<{ contentKey?: number }>) {
    const frame = this.frame.current;
    if (frame && previous.contentKey !== this.props.contentKey) {
      cancelAnimationFrame(this.request);
      frame.style.minHeight = `${frame.offsetHeight}px`;
    }
    return null;
  }

  componentDidUpdate(previous: Readonly<{ contentKey?: number }>) {
    if (previous.contentKey === this.props.contentKey) {
      return;
    }
    let frames = 0;
    const release = () => {
      const frame = this.frame.current;
      if (!frame) {
        return;
      }
      frames += 1;
      // Lexical fills each card's container a render after it adds the container.
      if (frame.querySelector('[data-lexical-decorator]:empty') && frames < HOLD_FRAMES) {
        this.request = requestAnimationFrame(release);
        return;
      }
      frame.style.minHeight = '';
    };
    this.request = requestAnimationFrame(release);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.request);
  }

  render() {
    return (
      <div
        ref={this.frame}
        className="koenig-react-editor koenig-lexical mx-auto w-full max-w-[740px]"
      >
        {this.props.children}
      </div>
    );
  }
}

// Memoized: every prop is referentially stable, so a settings edit elsewhere in
// the editor must not re-render two composer subtrees.
export const KoenigPostEditor = memo(function KoenigPostEditor(props: KoenigPostEditorProps) {
  const editor = loadKoenig();
  const { contentKey, onSecondaryError } = props;

  const onSecondaryInstanceError = useCallback(
    (error: unknown) => {
      secondaryErrors.onError(error);
      onSecondaryError?.();
    },
    [onSecondaryError],
  );

  const onSecondaryRenderError = useCallback(
    (error: unknown, info: ErrorInfo) => {
      secondaryErrors.onRenderError(error, info);
      onSecondaryError?.();
    },
    [onSecondaryError],
  );

  return (
    <BodyFrame contentKey={contentKey}>
      <ErrorBoundary key={contentKey} name="the editor" onError={primaryErrors.onRenderError}>
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <LoadingIndicator size="lg" />
            </div>
          }
        >
          {/* Mounted first so each load-time normalization reaches the baseline before
              the visible instance reports it. A crash costs only the baseline. */}
          <ErrorBoundary fallback={null} name="the editor" onError={onSecondaryRenderError}>
            <KoenigInstanceMount
              {...props}
              editor={editor}
              isSecondary={true}
              onError={onSecondaryInstanceError}
            />
          </ErrorBoundary>
          <KoenigInstanceMount
            {...props}
            editor={editor}
            isSecondary={false}
            onError={primaryErrors.onError}
          />
        </Suspense>
      </ErrorBoundary>
    </BodyFrame>
  );
});
