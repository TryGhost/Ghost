import React from 'react';

import Heading from './Heading';
import Hint from './Hint';

type resizeOptions = 'both' | 'vertical' | 'horizontal' | 'none';

interface TextAreaProps {
    inputRef?: React.RefObject<HTMLTextAreaElement>;
    title?: string;
    value?: string;
    rows?: number;
    maxLength?: number;
    resize?: resizeOptions;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextArea: React.FC<TextAreaProps> = ({inputRef, title, value, rows = 4, maxLength, resize, error, placeholder, hint, onChange, ...props}) => {
    let styles = `border-b bg-grey-100 px-[10px] py-2 ${error ? `border-red` : `border-grey-300 hover:border-grey-400 focus:border-grey-600`} ${title && `mt-2`}`;

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
            {title && <Heading useLabelTag={true}>{title}</Heading>}
            <textarea
                ref={inputRef} 
                className={styles}
                defaultValue={value} 
                maxLength={maxLength}
                placeholder={placeholder}
                rows={rows}
                onChange={onChange}
                {...props}>
            </textarea>
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
            {maxLength && <Hint>Max length is {maxLength}</Hint>}
        </div>
    );
};

export default TextArea;