import CodeMirror, {ReactCodeMirrorProps, ReactCodeMirrorRef} from '@uiw/react-codemirror';
import Heading from '../Heading';
import Hint from '../Hint';
import React, {forwardRef, useEffect, useId} from 'react';
import clsx from 'clsx';
import {EditorView} from '@codemirror/view';
import {Extension} from '@codemirror/state';

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

const theme = EditorView.theme({
    '& .cm-scroller': {
        fontFamily: 'Consolas, Liberation Mono, Menlo, Courier, monospace'
    },

    '& .cm-activeLine, & .cm-activeLineGutter': {
        backgroundColor: 'transparent'
    }
});

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
    ...props
}, ref) {
    const id = useId();
    const [resolvedExtensions, setResolvedExtensions] = React.useState<Extension[] | null>(null);

    useEffect(() => {
        Promise.all(extensions).then(setResolvedExtensions);
    }, [extensions]);

    let styles = clsx(
        'peer order-2 overflow-hidden rounded-sm border',
        clearBg ? 'bg-transparent' : 'bg-grey-75',
        error ? 'border-red' : 'border-grey-500 hover:border-grey-700 focus:border-grey-800',
        title && 'mt-2',
        height === 'full' && 'h-full'
    );

    if (!resolvedExtensions) {
        return null;
    }

    return (
        <div className={height === 'full' ? 'h-full' : ''}>
            <CodeMirror
                ref={ref}
                className={styles}
                extensions={resolvedExtensions}
                height={height === 'full' ? '100%' : height}
                theme={theme}
                value={value}
                onChange={onChange}
                {...props}
            />
            {title && <Heading className={'order-1 !text-grey-700 peer-focus:!text-black'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            {hint && <Hint className='order-3' color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
});

export default CodeEditorView;
