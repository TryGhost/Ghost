import { Suspense, useMemo } from 'react';
import ErrorBoundary from '@/settings/components/error-boundary';
import {
  type EditorResource,
  type KoenigInstance,
  loadKoenig,
} from '@/settings/components/koenig-loader';
import type { PostCardConfig } from './card-config';
import { reportKoenigError } from './koenig-error';

export interface FeatureImageCaptionProps {
  /** Paragraph-wrapped caption HTML; the editor parses it as a document. */
  html: string | null;
  placeholder: string;
  darkMode: boolean;
  searchLinks: PostCardConfig['searchLinks'];
  onChangeHtml: (html: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onTkCountChange: (count: number) => void;
  registerAPI: (api: KoenigInstance | null) => void;
}

function CaptionMount({
  editor,
  html,
  placeholder,
  darkMode,
  searchLinks,
  onChangeHtml,
  onFocus,
  onBlur,
  onTkCountChange,
  registerAPI,
}: FeatureImageCaptionProps & { editor: EditorResource }) {
  const {
    KoenigComposer,
    KoenigComposableEditor,
    HtmlOutputPlugin,
    EmojiPickerPlugin,
    TKCountPlugin,
    MINIMAL_NODES,
    MINIMAL_TRANSFORMERS,
  } = editor.read();

  return (
    <KoenigComposer
      cardConfig={{ searchLinks }}
      isTKEnabled={true}
      nodes={MINIMAL_NODES}
      onError={reportKoenigError}
    >
      <KoenigComposableEditor
        className="koenig-lexical-editor-input"
        darkMode={darkMode}
        isSnippetsEnabled={false}
        markdownTransformers={MINIMAL_TRANSFORMERS}
        placeholderClassName="koenig-lexical-editor-input-placeholder"
        placeholderText={placeholder}
        registerAPI={registerAPI}
        singleParagraph={true}
        onBlur={onBlur}
        onFocus={onFocus}
      >
        <HtmlOutputPlugin html={html ?? undefined} setHtml={onChangeHtml} />
        <EmojiPickerPlugin />
        <TKCountPlugin onChange={onTkCountChange} />
      </KoenigComposableEditor>
    </KoenigComposer>
  );
}

/** The feature image caption: one paragraph of basic formatting, emitted as HTML. */
export function FeatureImageCaption(props: FeatureImageCaptionProps) {
  const editor = useMemo(() => loadKoenig(), []);

  return (
    <div className="koenig-react-editor koenig-lexical flex-1">
      <ErrorBoundary name="the feature image caption">
        <Suspense fallback={null}>
          <CaptionMount {...props} editor={editor} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
