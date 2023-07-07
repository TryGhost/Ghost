import Heading from '../Heading';
import Hint from '../Hint';
import HtmlEditor, {HtmlEditorProps} from './HtmlEditor';
import React from 'react';
import clsx from 'clsx';

export type HtmlFieldProps = HtmlEditorProps & {
    /**
     * Should be passed the Ghost instance config to get the editor JS URL
     */
    config: { editor: { url: string; version: string; } };
    title?: string;
    hideTitle?: boolean;
    error?: boolean;
    hint?: React.ReactNode;
    clearBg?: boolean;
    className?: string;
    containerClassName?: string;
    hintClassName?: string;
    unstyled?: boolean;
}

/**
 * Renders a mini Koenig editor using KoenigComposableEditor.
 * Intended for use in settings forms where we don't need the full editor.
 */
const HtmlField: React.FC<HtmlFieldProps> = ({
    title,
    hideTitle,
    error,
    hint,
    value,
    clearBg = true,
    className = '',
    containerClassName = '',
    hintClassName = '',
    unstyled = false,
    ...props
}) => {
    const textFieldClasses = unstyled ? '' : clsx(
        'min-h-10 border-b py-2',
        clearBg ? 'bg-transparent' : 'bg-grey-75 px-[10px]',
        error ? `border-red` : `border-grey-500 hover:border-grey-700 focus:border-black`,
        (title && !hideTitle && !clearBg) && `mt-2`,
        className
    );

    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {title && <Heading className={hideTitle ? 'sr-only' : ''} grey={value ? true : false} useLabelTag={true}>{title}</Heading>}
            <div className={textFieldClasses}>
                <HtmlEditor {...props} value={value} />
            </div>
            {hint && <Hint className={hintClassName} color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default HtmlField;
