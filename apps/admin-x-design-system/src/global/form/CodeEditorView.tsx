import {Extension} from '@codemirror/state';
import CodeMirror, {ReactCodeMirrorProps, ReactCodeMirrorRef, BasicSetupOptions} from '@uiw/react-codemirror';
import clsx from 'clsx';
import React, {FocusEventHandler, forwardRef, useEffect, useId, useRef, useState} from 'react';
import {useFocusContext} from '../../providers/DesignSystemProvider';
import Heading from '../Heading';
import Hint from '../Hint';

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
    '[&_.cm-gutters]:bg-grey-75 dark:[&_.cm-gutters]:bg-grey-950',
    '[&_.cm-gutters]:text-grey-600 dark:[&_.cm-gutters]:text-grey-500',
    '[&_.cm-gutters]:border-grey-500 dark:[&_.cm-gutters]:border-grey-800',
    '[&_.cm-cursor]:border-grey-900 dark:[&_.cm-cursor]:border-grey-75',
    'dark:[&_.cm-tooltip-autocomplete.cm-tooltip_ul_li:not([aria-selected])]:bg-grey-975'
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
        clearBg ? 'bg-transparent' : 'bg-grey-75',
        error ? 'border-red' : 'border-grey-500 dark:border-grey-800',
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
            {title && <Heading className={'order-1 !text-grey-700 peer-focus:!text-black'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            {hint && <Hint className='order-3' color={error ? 'red' : ''}>{hint}</Hint>}
        </div>}
    </>;
});

export default CodeEditorView;
