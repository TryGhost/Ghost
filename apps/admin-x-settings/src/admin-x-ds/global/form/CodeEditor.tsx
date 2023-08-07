import CodeMirror from '@uiw/react-codemirror';
import Heading from '../Heading';
import Hint from '../Hint';
import React, {useId} from 'react';
import clsx from 'clsx';
import {Extension} from '@codemirror/state';

interface CodeEditorProps {
    title?: string;
    value?: string;
    height?: string;
    error?: boolean;
    hint?: React.ReactNode;
    clearBg?: boolean;
    extensions: Extension[];
    onChange?: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
    title,
    value,
    height = '200px',
    error,
    hint,
    clearBg = true,
    extensions,
    onChange
}) => {
    const id = useId();

    let styles = clsx(
        'peer order-2 rounded-sm border',
        clearBg ? 'bg-transparent' : 'bg-grey-75',
        error ? 'border-red' : 'border-grey-500 hover:border-grey-700 focus:border-grey-800',
        title && 'mt-2'
    );

    return (
        <div className='flex flex-col'>
            <CodeMirror
                className={styles}
                extensions={extensions}
                height={height}
                value={value}
                onChange={onChange}
            />
            {title && <Heading className={'order-1 !text-grey-700 peer-focus:!text-black'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            {hint && <Hint className='order-3' color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default CodeEditor;
