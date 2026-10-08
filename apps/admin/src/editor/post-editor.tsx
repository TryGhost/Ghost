import React, {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  Button,
  FieldError,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  buttonVariants,
} from '@tryghost/shade/components';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { useFocusContext } from '@tryghost/shade/app';
import { focusKoenigEditorOnBottomClick } from '@tryghost/admin-x-framework';
import {
  editorExcerptInput,
  editorTitleInput,
  editorWordCount,
  featureImageHiddenIndicator,
  postEditor,
  titleHiddenIndicator,
  tkIndicator,
  tkIndicatorExcerpt,
} from '@tryghost/test-data/selectors/editor';
import type { KoenigInstance } from '@/settings/components/koenig-loader';
import type { PostCardConfig, PostType } from './card-config';
import { FeatureImage } from './feature-image';
import { KoenigPostEditor } from './koenig-post-editor';
import { textHasTk } from './tk';
import { useOnscreenKeyboard } from './use-onscreen-keyboard';
import type { FeatureImageBinding } from './session/feature-image-binding';

export interface PostEditorProps {
  postType: PostType;
  title: string;
  excerpt: string;
  /** The rule the title breaks, shown under it. */
  titleError?: string | null;
  /** The rule the excerpt breaks, shown under it. */
  excerptError?: string | null;
  featureImage: FeatureImageBinding;
  /** A page that leaves out its own title and feature image: the canvas fades both. */
  titleAndFeatureImageHidden?: boolean;
  /** Initial body; the editor owns its own state after mount. */
  initialLexical: string | null;
  cardConfig: PostCardConfig;
  showExcerpt: boolean;
  autofocusTitle?: boolean;
  onTitleChange: (title: string) => void;
  onTitleBlur?: () => void;
  onExcerptChange: (excerpt: string) => void;
  onExcerptBlur?: () => void;
  onLexicalChange?: (lexical: unknown) => void;
  onSecondaryChange?: (lexical: unknown) => void;
  onSecondaryError?: () => void;
  registerEditorApi?: (api: KoenigInstance | null) => void;
  onTkCountChange?: (count: number) => void;
  /** Rendered in the footer after the word count. */
  wordCountAccessory?: React.ReactNode;
  /** Below the small breakpoint, the footer's place for the header's actions. */
  actionsSlotRef?: React.Ref<HTMLDivElement>;
  /** Lets the screen take the writer to the title or the excerpt. */
  handleRef?: React.Ref<PostEditorHandle>;
  /** From a settings panel toggle until everything moving with the panel has arrived. */
  settingsMoving?: boolean;
}

export interface PostEditorHandle {
  focusTitle: () => void;
  focusExcerpt: () => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Ember's global stylesheet, still loaded around the React editor, gives every
// textarea a 100px min-height and a 250–500px width; the fields opt out of both
// so they span the writing column and grow from a single line.
const fieldClassName =
  'block w-full max-w-none min-w-0 min-h-0 resize-none overflow-hidden border-0 bg-transparent p-0 outline-none';

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
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    // A web font arriving rewraps the text without resizing the field
    document.fonts?.addEventListener('loadingdone', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [ref, measure]);
}

function HiddenIndicator({
  className,
  label,
  testId,
}: {
  className: string;
  label: string;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className={cn('absolute -left-15 text-muted-foreground', className)}
          data-testid={testId}
          role="img"
        >
          <LucideIcon.EyeOff />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function TkIndicator({
  className,
  onClick,
  testId,
}: {
  className: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      className={cn(
        'absolute rounded-sm bg-state-warning px-1.5 py-0.5 text-2xs font-bold text-foreground',
        className,
      )}
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
  titleError = null,
  excerptError = null,
  featureImage,
  titleAndFeatureImageHidden = false,
  initialLexical,
  cardConfig,
  showExcerpt,
  autofocusTitle = false,
  onTitleChange,
  onTitleBlur,
  onExcerptChange,
  onExcerptBlur,
  onLexicalChange,
  onSecondaryChange,
  onSecondaryError,
  registerEditorApi,
  onTkCountChange,
  wordCountAccessory,
  actionsSlotRef,
  handleRef,
  settingsMoving = false,
}: PostEditorProps) {
  const { darkMode, isAdmin7 } = useFocusContext();
  const isKeyboardOpen = useOnscreenKeyboard();
  const scrollPaneRef = useRef<HTMLDivElement>(null);
  const writingAreaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);
  const titleErrorId = useId();
  const excerptErrorId = useId();
  const editorApiRef = useRef<KoenigInstance | null>(null);
  const skipFocusEditorRef = useRef(false);
  const [wordCount, setWordCount] = useState(0);
  const [bodyTkCount, setBodyTkCount] = useState(0);
  const [featureImageTkCount, setFeatureImageTkCount] = useState(0);

  useAutosize(titleRef, title);
  useAutosize(excerptRef, excerpt);

  // Koenig's breakout cards are sized in viewport units less
  // `--kg-breakout-adjustment`, the width beside the writing area. The settings
  // panel's share of it is CSS on the writing area, from the shell's static
  // progress; this measures the rest: the pane's offset and its scrollbar. The
  // panel's motion leaves both unchanged, so nothing is written while it runs —
  // rewriting an inherited property every frame would restyle the whole document.
  useLayoutEffect(() => {
    const pane = scrollPaneRef.current;
    const area = writingAreaRef.current;
    if (!pane || !area) {
      return;
    }
    let written = '';
    const measure = () => {
      const scrollbar = pane.offsetWidth - pane.clientWidth;
      const inset = `${Math.max(0, pane.getBoundingClientRect().left + scrollbar)}px`;
      if (inset !== written) {
        written = inset;
        area.style.setProperty('--editor-breakout-inset', inset);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // While the panel moves, that resting value is where the cards end up rather
  // than where the writing area is. So on each frame the pane resizes, this sizes
  // the cards from the layout itself, writing only on the cards so only their
  // subtrees restyle. Resize observers run after layout and before paint, so each
  // frame draws the cards at that frame's writing area; transitions of the cards'
  // own geometry drift from the panel's in WebKit. Koenig sizes cards from a
  // fallback it derives once at its root, so a card takes that property too.
  useLayoutEffect(() => {
    const pane = scrollPaneRef.current;
    const area = writingAreaRef.current;
    if (!settingsMoving || !pane || !area) {
      return;
    }
    const fitted = new Set<HTMLElement>();
    const fit = () => {
      const adjustment = `${Math.max(0, window.innerWidth - area.getBoundingClientRect().width)}px`;
      for (const card of area.querySelectorAll<HTMLElement>('[data-kg-card]')) {
        fitted.add(card);
        if (card.style.getPropertyValue('--kg-breakout-adjustment') !== adjustment) {
          card.style.setProperty('--kg-breakout-adjustment', adjustment);
          card.style.setProperty('--kg-breakout-adjustment-with-fallback', adjustment);
        }
      }
    };
    // The panel's resting value already applies, so this keeps the motion's first
    // frame at the writing area's current width.
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(pane);
    return () => {
      observer.disconnect();
      for (const card of fitted) {
        card.style.removeProperty('--kg-breakout-adjustment');
        card.style.removeProperty('--kg-breakout-adjustment-with-fallback');
      }
    };
  }, [settingsMoving]);

  const hasFeatureImage = !!featureImage.featureImage;
  const titleHasTk = textHasTk(title);
  const excerptHasTk = showExcerpt && textHasTk(excerpt);

  useEffect(() => {
    onTkCountChange?.(
      (titleHasTk ? 1 : 0) + (excerptHasTk ? 1 : 0) + bodyTkCount + featureImageTkCount,
    );
  }, [onTkCountChange, titleHasTk, excerptHasTk, bodyTkCount, featureImageTkCount]);

  const focusTitle = useCallback(() => {
    titleRef.current?.focus();
  }, []);

  const focusExcerpt = useCallback(() => {
    excerptRef.current?.focus();
    // runs after the keyboard event so the caret lands at the end
    setTimeout(() => excerptRef.current?.setSelectionRange(-1, -1), 0);
  }, []);

  useImperativeHandle(handleRef, () => ({ focusTitle, focusExcerpt }), [focusTitle, focusExcerpt]);

  const registerApi = useCallback(
    (api: KoenigInstance | null) => {
      editorApiRef.current = api;
      registerEditorApi?.(api);
    },
    [registerEditorApi],
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
    <div className="relative h-full min-h-0" data-testid={postEditor}>
      <div
        ref={scrollPaneRef}
        className="h-full scroll-pt-(--editor-overlap) overflow-x-hidden overflow-y-auto"
      >
        {/* Beside the settings panel, the breakout adjustment adds the panel and the
            margin before it at their resting values; while the panel moves, the
            cards are sized from the layout instead (above). */}
        <Stack
          ref={writingAreaRef}
          className="min-h-full px-6 pt-[calc(var(--spacing)*12+var(--editor-overlap,0px))] pb-24 editor-settings-motion-[margin-right] [--kg-breakout-adjustment:var(--editor-breakout-inset,0px)] lg:mr-[calc(var(--spacing)*3*var(--editor-settings-progress,0))] lg:[--kg-breakout-adjustment:calc(var(--editor-breakout-inset,0px)+(var(--editor-settings-width,0px)+var(--spacing)*3)*var(--editor-settings-progress,0))]"
          gap="none"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onPaneDrop}
          onMouseDown={trackMouseDown}
          onMouseUp={focusEditorOnPaneClick}
        >
          <div className="relative mx-auto w-full max-w-[740px]">
            <FeatureImage
              alt={featureImage.featureImageAlt}
              caption={featureImage.featureImageCaption}
              captionKey={featureImage.featureImageCaptionKey}
              cardConfig={cardConfig}
              darkMode={darkMode}
              faded={titleAndFeatureImageHidden}
              image={featureImage.featureImage}
              onAltChange={featureImage.onFeatureImageAltChange}
              onCaptionBlur={featureImage.onFeatureImageCaptionBlur}
              onCaptionChange={featureImage.onFeatureImageCaptionChange}
              onCaptionFocus={featureImage.onFeatureImageCaptionFocus}
              onImageChange={featureImage.onFeatureImageChange}
              onImageClear={featureImage.onFeatureImageClear}
              onTkCountChange={setFeatureImageTkCount}
            />
            {titleAndFeatureImageHidden && hasFeatureImage && (
              <HiddenIndicator
                className="-top-px"
                label="Feature image and post title are hidden on page"
                testId={featureImageHiddenIndicator}
              />
            )}
            <div className="relative">
              {titleAndFeatureImageHidden && !hasFeatureImage && (
                <HiddenIndicator
                  className="top-4.5"
                  label="Post title is hidden on page"
                  testId={titleHiddenIndicator}
                />
              )}
              {titleHasTk && (
                <TkIndicator
                  className="top-4.5 -right-14"
                  testId={tkIndicator}
                  onClick={focusTitle}
                />
              )}
              <textarea
                ref={titleRef}
                aria-describedby={titleError ? titleErrorId : undefined}
                aria-invalid={!!titleError}
                aria-label={`${capitalize(postType)} title`}
                autoFocus={autofocusTitle}
                className={cn(
                  fieldClassName,
                  'heading-font-features mb-4 pb-1 text-[4.8rem] leading-[1.1] font-bold tracking-[-0.017em] text-foreground placeholder:font-bold placeholder:text-editor-placeholder max-[769px]:text-[3.6rem] max-[501px]:text-[2.8rem]',
                  titleAndFeatureImageHidden && 'opacity-50 focus:opacity-100',
                )}
                data-testid={editorTitleInput}
                placeholder={`${capitalize(postType)} title`}
                rows={1}
                value={title}
                onBlur={onTitleBlur}
                onChange={(event) => onTitleChange(event.target.value)}
                onKeyDown={onTitleKeyDown}
                onPaste={cleanPastedTitle}
              />
            </div>
            {titleError ? (
              <FieldError className="-mt-2 mb-4" id={titleErrorId}>
                {titleError}
              </FieldError>
            ) : null}
            {showExcerpt && (
              <div className="relative">
                {excerptHasTk && (
                  <TkIndicator
                    className="top-1 -right-14"
                    testId={tkIndicatorExcerpt}
                    onClick={focusExcerpt}
                  />
                )}
                <textarea
                  ref={excerptRef}
                  aria-describedby={excerptError ? excerptErrorId : undefined}
                  aria-invalid={!!excerptError}
                  aria-label="Excerpt"
                  className={cn(
                    fieldClassName,
                    'text-[2rem] leading-[1.5] font-[440] tracking-[-0.018em] text-foreground/90 placeholder:font-normal placeholder:text-editor-placeholder',
                  )}
                  data-testid={editorExcerptInput}
                  placeholder="Add an excerpt"
                  rows={1}
                  value={excerpt}
                  onBlur={onExcerptBlur}
                  onChange={(event) => onExcerptChange(event.target.value)}
                  onKeyDown={onExcerptKeyDown}
                />
                <hr
                  className={cn(
                    'mt-4',
                    excerptError ? 'mb-0 border-destructive' : 'mb-12 border-border-default',
                  )}
                />
                {excerptError ? (
                  <FieldError className="mt-2 mb-12" id={excerptErrorId}>
                    {excerptError}
                  </FieldError>
                ) : null}
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
            onChange={onLexicalChange}
            onSecondaryChange={onSecondaryChange}
            onSecondaryError={onSecondaryError}
            onTkCountChange={setBodyTkCount}
            onWordCountChange={setWordCount}
          />
        </Stack>
      </div>
      {/* Below the small breakpoint the footer spans the screen: the word count at
          the left, the header's actions at the right, and no help link. Only its
          controls take pointer input, so the document between them stays reachable.
          Actions that wrap grow upward, leaving the word count in the corner. */}
      <Inline
        align="end"
        className="absolute right-[calc(var(--spacing)*(4+2*var(--editor-settings-progress,0)))] bottom-3 z-20 editor-settings-motion-[right] max-[500px]:inset-x-3 max-sm:pointer-events-none max-sm:*:pointer-events-auto min-[500px]:max-sm:left-4"
        gap="sm"
      >
        {!isKeyboardOpen && (
          <Text
            as="span"
            className={buttonVariants({
              variant: null,
              size: isAdmin7 ? 'default' : 'sm',
              shape: 'pill',
              isAdmin7,
              className:
                'bg-background/80 px-3 text-(length:--text-control) text-text-secondary backdrop-blur-sm',
            })}
            data-testid={editorWordCount}
            tone="secondary"
            weight="medium"
          >
            {formatNumber(wordCount)} {wordCount === 1 ? 'word' : 'words'}
          </Text>
        )}
        {wordCountAccessory}
        <Inline
          ref={actionsSlotRef}
          // The on-screen keyboard would cover them, as it would the word count.
          className={cn('ml-auto min-w-0 sm:hidden', isKeyboardOpen && 'hidden')}
          justify="end"
        />
        <Button
          className={cn(
            'bg-background/80 text-text-secondary backdrop-blur-sm hover:text-foreground max-sm:hidden',
            isAdmin7 && '[&_svg]:stroke-2!',
          )}
          shape="pill"
          size={isAdmin7 ? 'icon' : 'icon-sm'}
          variant="ghost"
          asChild
        >
          <a
            aria-label="Editor help"
            href="https://ghost.org/help/using-the-editor/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LucideIcon.CircleHelp />
          </a>
        </Button>
      </Inline>
    </div>
  );
}
