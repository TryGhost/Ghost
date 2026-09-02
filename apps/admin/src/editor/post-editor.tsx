import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { useFocusContext } from '@tryghost/shade/app';
import { focusKoenigEditorOnBottomClick } from '@tryghost/admin-x-framework';
import type { KoenigInstance } from '@/settings/components/koenig-loader';
import type { PostCardConfig, PostType } from './card-config';
import { KoenigPostEditor } from './koenig-post-editor';
import { textHasTk } from './tk';

export interface PostEditorProps {
  postType: PostType;
  title: string;
  excerpt: string;
  /** Initial body; the editor owns its own state after mount. */
  initialLexical: string | null;
  cardConfig: PostCardConfig;
  showExcerpt: boolean;
  autofocusTitle?: boolean;
  onTitleChange: (title: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onLexicalChange?: (lexical: unknown) => void;
  onSecondaryChange?: (lexical: unknown) => void;
  registerEditorApi?: (api: KoenigInstance | null) => void;
  registerSecondaryApi?: (api: KoenigInstance | null) => void;
  onTkCountChange?: (count: number) => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const fieldClassName =
  'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none';

function useAutosize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [ref]);

  useLayoutEffect(measure, [measure, value]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    // measuring inside the observer callback would resize the observed element mid-loop
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, measure]);
}

function TkIndicator({ onClick, testId }: { onClick: () => void; testId: string }) {
  return (
    <button
      className="absolute top-1 -left-12 rounded-sm bg-state-warning px-1.5 py-0.5 text-2xs font-bold text-foreground"
      data-testid={testId}
      type="button"
      onClick={onClick}
    >
      TK
    </button>
  );
}

export function PostEditor({
  postType,
  title,
  excerpt,
  initialLexical,
  cardConfig,
  showExcerpt,
  autofocusTitle = false,
  onTitleChange,
  onExcerptChange,
  onLexicalChange,
  onSecondaryChange,
  registerEditorApi,
  registerSecondaryApi,
  onTkCountChange,
}: PostEditorProps) {
  const { darkMode } = useFocusContext();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);
  const editorApiRef = useRef<KoenigInstance | null>(null);
  const skipFocusEditorRef = useRef(false);
  const [wordCount, setWordCount] = useState(0);
  const [bodyTkCount, setBodyTkCount] = useState(0);

  useAutosize(titleRef, title);
  useAutosize(excerptRef, excerpt);

  const titleHasTk = textHasTk(title);
  const excerptHasTk = showExcerpt && textHasTk(excerpt);

  useEffect(() => {
    onTkCountChange?.((titleHasTk ? 1 : 0) + (excerptHasTk ? 1 : 0) + bodyTkCount);
  }, [onTkCountChange, titleHasTk, excerptHasTk, bodyTkCount]);

  const focusTitle = useCallback(() => {
    titleRef.current?.focus();
  }, []);

  const focusExcerpt = useCallback(() => {
    excerptRef.current?.focus();
    // runs after the keyboard event so the caret lands at the end
    setTimeout(() => excerptRef.current?.setSelectionRange(-1, -1), 0);
  }, []);

  const registerApi = useCallback(
    (api: KoenigInstance | null) => {
      editorApiRef.current = api;
      registerEditorApi?.(api);
    },
    [registerEditorApi],
  );

  const registerSecondary = useCallback(
    (api: KoenigInstance | null) => {
      registerSecondaryApi?.(api);
    },
    [registerSecondaryApi],
  );

  const moveIntoEditor = (key: string) => {
    const editorApi = editorApiRef.current;
    if (!editorApi) {
      return;
    }
    if (key === 'Enter' && !editorApi.editorIsEmpty()) {
      editorApi.insertParagraphAtTop({ focus: true });
    } else {
      editorApi.focusEditor({ position: 'top' });
    }
  };

  const onTitleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { key } = event;
    const { value, selectionStart } = event.currentTarget;
    const couldLeaveTitle = !value || selectionStart === value.length;

    if (showExcerpt) {
      // Tab is handled by the browser
      if (key === 'Enter') {
        event.preventDefault();
        focusExcerpt();
      }
      if ((key === 'ArrowDown' || key === 'ArrowRight') && !event.shiftKey && couldLeaveTitle) {
        event.preventDefault();
        focusExcerpt();
      }
      return;
    }

    if (!editorApiRef.current || event.nativeEvent.isComposing) {
      return;
    }

    const arrowLeavingTitle = (key === 'ArrowDown' || key === 'ArrowRight') && couldLeaveTitle;
    if (key === 'Enter' || key === 'Tab' || arrowLeavingTitle) {
      event.preventDefault();
      moveIntoEditor(key);
    }
  };

  const onExcerptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { key } = event;
    const { value, selectionStart } = event.currentTarget;

    if ((key === 'ArrowUp' || key === 'ArrowLeft') && !event.shiftKey) {
      if (!value || selectionStart === 0) {
        event.preventDefault();
        focusTitle();
        return;
      }
    }

    const couldLeaveExcerpt = !value || selectionStart === value.length;
    const arrowLeavingExcerpt = (key === 'ArrowRight' || key === 'ArrowDown') && couldLeaveExcerpt;
    if (key === 'Enter' || (key === 'Tab' && !event.shiftKey) || arrowLeavingExcerpt) {
      event.preventDefault();
      moveIntoEditor(key);
    }
  };

  const cleanPastedTitle = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) {
      return;
    }
    event.preventDefault();
    // execCommand keeps the paste on the browser's undo stack
    document.execCommand('insertText', false, pastedText.replace(/(\n|\r)+/g, ' ').trim());
  };

  // A mousedown on a card can deselect another card, so the mouseup can land
  // outside the clicked card; refocusing then would change the selection
  const trackMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    skipFocusEditorRef.current = event.nativeEvent
      .composedPath()
      .some(
        (element) =>
          element instanceof Element &&
          element.matches('[data-lexical-decorator], [data-kg-slash-menu]'),
      );
  };

  const focusEditorOnPaneClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !skipFocusEditorRef.current &&
      event.target === event.currentTarget &&
      editorApiRef.current
    ) {
      focusKoenigEditorOnBottomClick(editorApiRef.current, event);
    }
    skipFocusEditorRef.current = false;
  };

  const onPaneDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.files.length > 0) {
      event.preventDefault();
      editorApiRef.current?.insertFiles(Array.from(event.dataTransfer.files));
    }
  };

  return (
    <div className="relative h-full min-h-0" data-testid="post-editor">
      <div className="h-full overflow-y-auto">
        <Stack
          className="min-h-full px-6 pt-12 pb-24"
          gap="none"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onPaneDrop}
          onMouseDown={trackMouseDown}
          onMouseUp={focusEditorOnPaneClick}
        >
          <div className="relative mx-auto w-full max-w-[740px]">
            {titleHasTk && <TkIndicator testId="tk-indicator" onClick={focusTitle} />}
            <textarea
              ref={titleRef}
              aria-label={`${capitalize(postType)} title`}
              autoFocus={autofocusTitle}
              className={cn(
                fieldClassName,
                'mb-4 text-4xl leading-tight font-bold tracking-tight text-foreground placeholder:font-bold placeholder:text-muted-foreground',
              )}
              data-testid="editor-title-input"
              placeholder={`${capitalize(postType)} title`}
              rows={1}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              onKeyDown={onTitleKeyDown}
              onPaste={cleanPastedTitle}
            />
            {showExcerpt && (
              <div className="relative">
                {excerptHasTk && (
                  <TkIndicator testId="tk-indicator-excerpt" onClick={focusExcerpt} />
                )}
                <textarea
                  ref={excerptRef}
                  aria-label="Excerpt"
                  className={cn(
                    fieldClassName,
                    'text-xl leading-normal tracking-tight text-text-secondary placeholder:text-muted-foreground',
                  )}
                  data-testid="editor-excerpt-input"
                  placeholder="Add an excerpt"
                  rows={1}
                  value={excerpt}
                  onChange={(event) => onExcerptChange(event.target.value)}
                  onKeyDown={onExcerptKeyDown}
                />
                <hr className="mt-4 mb-6 border-border" />
              </div>
            )}
          </div>
          <KoenigPostEditor
            cardConfig={cardConfig}
            cursorDidExitAtTop={showExcerpt ? focusExcerpt : focusTitle}
            darkMode={darkMode}
            initialLexical={initialLexical}
            placeholder={`Begin writing your ${postType}...`}
            registerAPI={registerApi}
            registerSecondaryAPI={registerSecondary}
            onChange={onLexicalChange}
            onSecondaryChange={onSecondaryChange}
            onTkCountChange={setBodyTkCount}
            onWordCountChange={setWordCount}
          />
        </Stack>
      </div>
      <Inline className="absolute right-0 bottom-0 px-4 py-3" gap="sm">
        <Text data-testid="editor-word-count" size="xs" tone="secondary">
          {formatNumber(wordCount)} {wordCount === 1 ? 'word' : 'words'}
        </Text>
        <a
          aria-label="Editor help"
          className="text-text-secondary hover:text-foreground"
          href="https://ghost.org/help/using-the-editor/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <LucideIcon.CircleHelp className="size-4" />
        </a>
      </Inline>
    </div>
  );
}
