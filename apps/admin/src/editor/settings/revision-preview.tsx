import DOMPurify from 'dompurify';
import { Suspense, useCallback, useMemo } from 'react';
import { LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { koenigFileUploadTypes, useKoenigFileUpload } from '@tryghost/admin-x-framework/hooks';
import {
  postHistoryPreview,
  postHistoryPreviewBody,
  postHistoryPreviewExcerpt,
  postHistoryPreviewFeatureImage,
  postHistoryPreviewTitle,
} from '@tryghost/test-data/selectors/editor';
import ErrorBoundary from '@/settings/components/error-boundary';
import {
  type EditorResource,
  type KoenigInstance,
  loadKoenig,
} from '@/settings/components/koenig-loader';
import type { PostCardConfig } from '@/editor/card-config';
import { reportKoenigError } from '@/editor/koenig-error';
import type { RevisionEntry } from './post-history';

const fileUploader = {
  useFileUpload: useKoenigFileUpload,
  fileTypes: koenigFileUploadTypes,
};

/** The part of Lexical's editor the loader's minimal instance type leaves out. */
type LexicalEditable = { setEditable: (editable: boolean) => void };

/** A caption is stored HTML; only the marks a caption can carry survive here. */
function sanitizeCaption(caption: string | null): string {
  return DOMPurify.sanitize(caption ?? '', {
    ALLOWED_TAGS: ['a', 'b', 'i', 'span'],
    ALLOWED_ATTR: ['href', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

function RevisionBody({
  editor,
  lexical,
  cardConfig,
  darkMode,
}: {
  editor: EditorResource;
  lexical: string | null;
  cardConfig: PostCardConfig;
  darkMode: boolean;
}) {
  const { KoenigComposer, KoenigEditor } = editor.read();

  // Koenig's `readOnly` only stops drag and drop; Lexical's own `setEditable`
  // is what makes the document uneditable.
  const lockEditor = useCallback((api: KoenigInstance | null) => {
    (api?.editorInstance as LexicalEditable | undefined)?.setEditable(false);
  }, []);

  return (
    <div className="koenig-react-editor koenig-lexical" data-testid={postHistoryPreviewBody}>
      <KoenigComposer
        cardConfig={cardConfig}
        darkMode={darkMode}
        fileUploader={fileUploader}
        initialEditorState={lexical ?? undefined}
        onError={reportKoenigError}
      >
        <KoenigEditor darkMode={darkMode} placeholderText="" registerAPI={lockEditor} readOnly />
      </KoenigComposer>
    </div>
  );
}

export interface RevisionPreviewProps {
  revision: RevisionEntry;
  cardConfig: PostCardConfig;
  darkMode: boolean;
  /** The excerpt reads under the title, so the preview shows it there too. */
  showExcerpt: boolean;
  /** Stands in for a version that carries no title of its own. */
  currentTitle: string;
  /** Stands in for a version written before the excerpt existed. */
  currentExcerpt: string | null;
}

/** A revision as it was written: its feature image, title, excerpt and body. */
export function RevisionPreview({
  revision,
  cardConfig,
  darkMode,
  showExcerpt,
  currentTitle,
  currentExcerpt,
}: RevisionPreviewProps) {
  const editor = useMemo(() => loadKoenig(), []);
  const caption = sanitizeCaption(revision.featureImageCaption);
  const title = revision.title || currentTitle;
  const excerpt = revision.customExcerpt ?? currentExcerpt;

  return (
    <div className="mx-auto w-full max-w-[740px]" data-testid={postHistoryPreview}>
      <ErrorBoundary name="this version">
        <Suspense
          fallback={
            <Inline className="py-10" justify="center">
              <LoadingIndicator size="lg" />
            </Inline>
          }
        >
          {revision.featureImage ? (
            <figure className="mb-6">
              <img
                alt={revision.featureImageAlt ?? ''}
                className="w-full"
                data-testid={postHistoryPreviewFeatureImage}
                src={revision.featureImage}
              />
              {caption ? (
                <figcaption
                  // The caption is stored HTML, sanitized to a caption's own marks above.
                  dangerouslySetInnerHTML={{ __html: caption }}
                  className="mt-2 text-center text-sm text-text-secondary"
                />
              ) : null}
            </figure>
          ) : null}
          <div
            className="heading-font-features mb-4 text-4xl leading-tight font-bold tracking-tight text-foreground"
            data-testid={postHistoryPreviewTitle}
          >
            {title}
          </div>
          {showExcerpt ? (
            <>
              <div
                className="text-xl leading-normal tracking-tight text-text-secondary"
                data-testid={postHistoryPreviewExcerpt}
              >
                {excerpt}
              </div>
              {excerpt ? <hr className="mt-4 mb-6 border-border" /> : null}
            </>
          ) : null}
          {revision.lexical === null ? (
            <Text tone="secondary">This version has no body content to restore.</Text>
          ) : (
            <RevisionBody
              key={revision.id}
              cardConfig={cardConfig}
              darkMode={darkMode}
              editor={editor}
              lexical={revision.lexical}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
