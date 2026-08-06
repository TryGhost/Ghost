import CodeMirror, {EditorView, tooltips, type BasicSetupOptions, type ReactCodeMirrorProps, type ReactCodeMirrorRef} from '@uiw/react-codemirror';
import React, {type FocusEventHandler, forwardRef, useEffect, useId, useMemo, useRef, useState} from 'react';
import {FieldDescription, FieldLabel} from './field';
import {cn} from '@/lib/utils';
import {useFocusContext} from '@/providers/shade-provider';
import type {Extension} from '@codemirror/state';

export interface CodeEditorProps extends Omit<ReactCodeMirrorProps, 'value' | 'onChange' | 'extensions'> {
    title?: string;
    value?: string;
    height?: string;
    error?: boolean;
    hint?: React.ReactNode;
    clearBg?: boolean;
    extensions: Array<Extension | Promise<Extension>>;
    onChange?: (value: string) => void;
    // Applied to the editor's contenteditable via EditorView.contentAttributes —
    // an aria-label on the wrapper div is not announced by screen readers.
    ariaLabel?: string;
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
    '[&_.cm-cursor]:border-foreground'
].join(' ');

// Meant to be imported asynchronously to avoid including CodeMirror in the main bundle
const CodeEditorView = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(function CodeEditorView({
    title,
    value,
    height = '200px',
    error,
    hint,
    clearBg = true,
    extensions,
    onChange,
    onFocus,
    onBlur,
    className,
    ariaLabel,
    ...props
}, ref) {
    const id = useId();
    const sizeRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(100);
    const [resolvedExtensions, setResolvedExtensions] = React.useState<Extension[]>([]);
    const [basicSetup, setBasicSetup] = useState<BasicSetupOptions>({
        crosshairCursor: false
    });
    const {darkMode, setFocusState} = useFocusContext();

    // Tooltips (autocomplete) escape this component's overflow-hidden container
    // by rendering into a viewport-covering parent on document.body. The parent
    // must span the viewport because CodeMirror demotes fixed tooltips to
    // absolute (positioned against the parent's rect) whenever its offsetParent
    // heuristics trip — reliably in Safari under page zoom — and it must carry
    // the `shade` class so token-based tooltip styles resolve outside the app
    // root (`.dark` lives on <html>, so dark mode inherits). Tooltip styling is
    // global in styles.css; wrapper-scoped classes cannot reach it — including
    // the `.cm-tooltip-parent` reset that stops CodeMirror painting this
    // element over the whole app (see styles.css for why).
    const [tooltipParent] = useState(() => document.createElement('div'));
    useEffect(() => {
        tooltipParent.className = 'shade cm-tooltip-parent pointer-events-none fixed inset-0 z-[60]';
        document.body.appendChild(tooltipParent);
        return () => {
            tooltipParent.remove();
        };
    }, [tooltipParent]);

    const editorExtensions = useMemo(() => {
        const base = [...resolvedExtensions, tooltips({position: 'fixed', parent: tooltipParent})];
        return ariaLabel
            ? [...base, EditorView.contentAttributes.of({'aria-label': ariaLabel})]
            : base;
    }, [resolvedExtensions, ariaLabel, tooltipParent]);

    const handleFocus: FocusEventHandler<HTMLDivElement> = (e) => {
        onFocus?.(e);
        setFocusState(true);
    };

    const handleBlur: FocusEventHandler<HTMLDivElement> = (e) => {
        onBlur?.(e);
        setFocusState(false);
    };

    useEffect(() => {
        let cancelled = false;

        Promise.all(extensions).then((nextExtensions) => {
            if (!cancelled) {
                setResolvedExtensions(nextExtensions);
            }
        }, () => {
            if (!cancelled) {
                setResolvedExtensions([]);
            }
        });
        setBasicSetup(setup => ({...setup, searchKeymap: false}));

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
        'peer order-2 w-full max-w-full overflow-hidden rounded-sm border',
        clearBg ? 'bg-transparent' : 'bg-muted',
        error ? 'border-destructive' : 'border-border',
        title && 'mt-2',
        height === 'full' && 'h-full',
        codeMirrorClasses,
        className
    );

    return <>
        <div ref={sizeRef} />
        <div className={height === 'full' ? 'h-full' : ''} style={{width}}>
            <CodeMirror
                ref={ref}
                basicSetup={basicSetup}
                className={styles}
                extensions={editorExtensions}
                height={height === 'full' ? '100%' : height}
                theme={darkMode ? 'dark' : 'light'}
                value={value}
                onBlur={handleBlur}
                onChange={onChange}
                onFocus={handleFocus}
                {...props}
            />
            {title && <FieldLabel className='order-1' htmlFor={id}>{title}</FieldLabel>}
            {hint && <FieldDescription className={cn('order-3 mt-1', error && 'text-destructive')}>{hint}</FieldDescription>}
        </div>
    </>;
});

export default CodeEditorView;
