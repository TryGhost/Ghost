import CodeMirror, {
  EditorView,
  tooltips,
  type BasicSetupOptions,
  type ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import React, {
  type FocusEventHandler,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FieldDescription, FieldLabel } from '@/components/ui/field';
import { inputSurface } from '@/components/ui/input-surface';
import { Stack } from '@/components/primitives/stack';
import { cn } from '@/lib/utils';
import { useFocusContext } from '@/providers/shade-provider';
import type { Extension } from '@codemirror/state';

export interface CodeEditorProps extends Omit<
  ReactCodeMirrorProps,
  'value' | 'onChange' | 'extensions' | 'title'
> {
  title?: React.ReactNode;
  value?: string;
  height?: string;
  error?: boolean;
  hint?: React.ReactNode;
  clearBg?: boolean;
  extensions: Array<Extension | Promise<Extension> | (() => Extension | Promise<Extension>)>;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}

const codeMirrorClasses = [
  '[&_.cm-editor]:bg-transparent',
  '[&_.cm-editor]:border-transparent',
  '[&_.cm-scroller]:font-mono',
  '[&_.cm-scroller]:border-transparent',
  '[&_.cm-activeLine]:bg-transparent',
  '[&_.cm-activeLineGutter]:bg-transparent',
  '[&_.cm-gutters]:bg-muted',
  '[&_.cm-gutters]:text-muted-foreground',
  '[&_.cm-gutters]:border-border',
  '[&_.cm-cursor]:border-foreground',
].join(' ');

// Imported asynchronously by CodeEditor so CodeMirror stays out of the main bundle.
const CodeEditorView = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(function CodeEditorView(
  {
    title,
    value,
    height = '200px',
    error,
    hint,
    clearBg = true,
    extensions,
    ariaLabel,
    editable = true,
    onChange,
    onFocus,
    onBlur,
    className,
    ...props
  },
  ref,
) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-description`;
  const hasTitle = Boolean(title);
  const sizeRef = useRef<HTMLDivElement>(null);
  const { darkMode, setFocusState } = useFocusContext();
  const focusedRef = useRef(false);
  const setFocusStateRef = useRef(setFocusState);
  const [width, setWidth] = useState(100);
  const [resolvedExtensions, setResolvedExtensions] = useState<Extension[]>([]);

  setFocusStateRef.current = setFocusState;

  // Keep autocomplete outside the editor and accordion overflow boundaries.
  // CodeMirror can switch fixed tooltips to absolute after its first layout
  // measurement. A viewport-sized body host gives both positioning modes the
  // same coordinate space, preventing the visible first-frame jump.
  const [tooltipParent] = useState(() => document.createElement('div'));

  useEffect(() => {
    tooltipParent.className = 'shade cm-tooltip-parent pointer-events-none fixed inset-0 z-[60]';
    document.body.appendChild(tooltipParent);

    return () => {
      tooltipParent.remove();
    };
  }, [tooltipParent]);

  const basicSetup = useMemo<BasicSetupOptions>(
    () => ({
      crosshairCursor: false,
      searchKeymap: false,
    }),
    [],
  );

  const editorExtensions = useMemo(() => {
    const contentAttributes: Record<string, string> = { id };

    if (hasTitle) {
      contentAttributes['aria-labelledby'] = labelId;
    } else if (ariaLabel) {
      contentAttributes['aria-label'] = ariaLabel;
    }
    if (error) {
      contentAttributes['aria-invalid'] = 'true';
    }
    if (hint) {
      contentAttributes['aria-describedby'] = hintId;
    }
    if (!editable) {
      contentAttributes['aria-disabled'] = 'true';
    }

    return [
      ...resolvedExtensions,
      tooltips({ position: 'fixed', parent: tooltipParent }),
      EditorView.contentAttributes.of(contentAttributes),
    ];
  }, [
    ariaLabel,
    editable,
    error,
    hasTitle,
    hint,
    hintId,
    id,
    labelId,
    resolvedExtensions,
    tooltipParent,
  ]);

  const handleFocus: FocusEventHandler<HTMLDivElement> = (event) => {
    onFocus?.(event);
    focusedRef.current = true;
    setFocusState(true);
  };

  const handleBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    onBlur?.(event);
    focusedRef.current = false;
    setFocusState(false);
  };

  const handleLabelClick = () => {
    if (editable) {
      document.getElementById(id)?.focus();
    }
  };

  useEffect(() => {
    return () => {
      if (focusedRef.current) {
        setFocusStateRef.current(false);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pendingExtensions = extensions.map((extension) =>
      typeof extension === 'function' ? extension() : extension,
    );

    Promise.all(pendingExtensions).then(
      (nextExtensions) => {
        if (!cancelled) {
          setResolvedExtensions(nextExtensions);
        }
      },
      () => {
        if (!cancelled) {
          setResolvedExtensions([]);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [extensions]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    resizeObserver.observe(sizeRef.current!);

    return () => resizeObserver.disconnect();
  }, []);

  const styles = cn(
    inputSurface('within'),
    'peer order-2 w-full max-w-full overflow-hidden',
    clearBg && 'bg-transparent',
    height === 'full' && 'h-full',
    !editable && 'cursor-not-allowed opacity-50',
    codeMirrorClasses,
    className,
  );

  return (
    <div className={cn('w-full', height === 'full' && 'h-full')}>
      <div ref={sizeRef} />
      <Stack className={height === 'full' ? 'h-full' : ''} gap="xs" style={{ width }}>
        {title && (
          <FieldLabel id={labelId} onClick={handleLabelClick}>
            {title}
          </FieldLabel>
        )}
        <CodeMirror
          ref={ref}
          basicSetup={basicSetup}
          className={styles}
          editable={editable}
          extensions={editorExtensions}
          height={height === 'full' ? '100%' : height}
          theme={darkMode ? 'dark' : 'light'}
          value={value}
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={handleFocus}
          {...props}
        />
        {hint && (
          <FieldDescription className={cn(error && 'text-destructive')} id={hintId}>
            {hint}
          </FieldDescription>
        )}
      </Stack>
    </div>
  );
});

CodeEditorView.displayName = 'CodeEditorView';

export default CodeEditorView;
