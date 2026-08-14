import CodeMirror, {type BasicSetupOptions, type ReactCodeMirrorProps, type ReactCodeMirrorRef} from '@uiw/react-codemirror';
import React, {type FocusEventHandler, forwardRef, useEffect, useId, useRef, useState} from 'react';
import clsx from 'clsx';
import {FieldDescription, FieldLabel} from '@tryghost/shade/components';
import {useFocusContext} from '@tryghost/shade/app';
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
    '[&_.cm-tooltip-autocomplete.cm-tooltip_ul_li:not([aria-selected])]:bg-background'
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
    ...props
}, ref) {
    const id = useId();
    const sizeRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(100);
    const [resolvedExtensions, setResolvedExtensions] = React.useState<Extension[] | null>(null);
    const [basicSetup, setBasicSetup] = useState<BasicSetupOptions>({
        crosshairCursor: false
    });
    const {setFocusState} = useFocusContext();

    const handleFocus: FocusEventHandler<HTMLDivElement> = (e) => {
        onFocus?.(e);
        setFocusState(true);
    };

    const handleBlur: FocusEventHandler<HTMLDivElement> = (e) => {
        onBlur?.(e);
        setFocusState(false);
    };

    useEffect(() => {
        Promise.all(extensions).then(setResolvedExtensions);
        setBasicSetup(setup => ({setup, searchKeymap: false}));
    }, [extensions]);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
        });

        resizeObserver.observe(sizeRef.current!);

        return () => resizeObserver.disconnect();
    }, []);

    const styles = clsx(
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
        {resolvedExtensions && <div className={height === 'full' ? 'h-full' : ''} style={{width}}>
            <CodeMirror
                ref={ref}
                basicSetup={basicSetup}
                className={styles}
                extensions={resolvedExtensions}
                height={height === 'full' ? '100%' : height}
                value={value}
                onBlur={handleBlur}
                onChange={onChange}
                onFocus={handleFocus}
                {...props}
            />
            {title && <FieldLabel className='order-1' htmlFor={id}>{title}</FieldLabel>}
            {hint && <FieldDescription className={clsx('order-3 mt-1', error && 'text-destructive')}>{hint}</FieldDescription>}
        </div>}
    </>;
});

export default CodeEditorView;
