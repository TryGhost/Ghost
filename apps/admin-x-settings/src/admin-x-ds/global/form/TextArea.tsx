import React, {useId} from 'react';

import Heading from '../Heading';
import Hint from '../Hint';
import clsx from 'clsx';
import {useFocusContext} from '../../providers/DesignSystemProvider';

type ResizeOptions = 'both' | 'vertical' | 'horizontal' | 'none';
type FontStyles = 'sans' | 'mono';

interface TextAreaProps {
    inputRef?: React.RefObject<HTMLTextAreaElement>;
    title?: string;
    value?: string;
    rows?: number;
    maxLength?: number;
    resize?: ResizeOptions;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    clearBg?: boolean;
    fontStyle?: FontStyles;
    className?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextArea: React.FC<TextAreaProps> = ({
    inputRef,
    title,
    value,
    rows = 3,
    maxLength,
    resize = 'none',
    error,
    placeholder,
    hint,
    clearBg = true,
    fontStyle = 'sans',
    className,
    onChange,
    ...props
}) => {
    const id = useId();
    const {setFocusState} = useFocusContext();

    const handleFocus = () => {
        setFocusState(true);
    };

    const handleBlur = () => {
        setFocusState(false);
    };

    let styles = clsx(
        'peer order-2 rounded-sm border px-3 py-2 dark:text-white',
        clearBg ? 'bg-transparent' : 'bg-grey-75 dark:bg-grey-950',
        error ? 'border-red' : 'border-grey-500 placeholder:text-grey-500 hover:border-grey-700 focus:border-grey-800 dark:border-grey-800 dark:placeholder:text-grey-800 dark:hover:border-grey-700 dark:focus:border-grey-500',
        title && 'mt-2',
        fontStyle === 'mono' && 'font-mono text-sm',
        className
    );

    switch (resize) {
    case 'both':
        styles += ' resize ';
        break;
    case 'vertical':
        styles += ' resize-y ';
        break;
    case 'horizontal':
        styles += ' resize-x ';
        break;
    case 'none':
        styles += ' resize-none ';
        break;
    default:
        styles += ' resize ';
        break;
    }

    return (
        <div className='flex flex-col'>
            <textarea
                ref={inputRef}
                className={styles}
                id={id}
                maxLength={maxLength}
                placeholder={placeholder}
                rows={rows}
                value={value}
                onBlur={handleBlur}
                onChange={onChange}
                onFocus={handleFocus}
                {...props}>
            </textarea>
            {title && <Heading className={'order-1 !text-grey-700 peer-focus:!text-black dark:!text-grey-300 dark:peer-focus:!text-white'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            {hint && <Hint className='order-3' color={error ? 'red' : ''}>{hint}</Hint>}
            {maxLength && <Hint>Max length is {maxLength}</Hint>}
        </div>
    );
};

export default TextArea;
