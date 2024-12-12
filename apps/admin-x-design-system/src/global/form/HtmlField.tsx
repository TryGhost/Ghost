import Heading from '../Heading';
import Hint from '../Hint';
import HtmlEditor, {HtmlEditorProps} from './HtmlEditor';
import React from 'react';
import clsx from 'clsx';

export type HtmlFieldProps = HtmlEditorProps & {
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
    clearBg = false,
    className = '',
    containerClassName = '',
    hintClassName = '',
    unstyled = false,
    ...props
}) => {
    const textFieldClasses = unstyled ? '' : clsx(
        'flex min-h-[32px] items-center rounded-md border border-transparent py-1.5 md:min-h-[36px]',
        clearBg ? 'bg-transparent' : 'bg-grey-150 px-3 dark:bg-grey-900',
        error ? `border-red` : `transition-all hover:bg-grey-100 has-[:focus]:border-green has-[:focus]:bg-white has-[:focus]:shadow-[0_0_0_1px_rgba(48,207,67,1)] dark:selection:bg-[rgba(88,101,116,0.99)] dark:hover:bg-grey-925 dark:has-[:focus]:bg-grey-950`,
        (title && !hideTitle && !clearBg) && `mt-2`,
        className
    );

    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {title && <Heading className={hideTitle ? 'sr-only' : ''} grey={true} useLabelTag={true}>{title}</Heading>}
            <div className={textFieldClasses}>
                <HtmlEditor {...props} value={value} />
            </div>
            {hint && <Hint className={hintClassName} color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default HtmlField;
