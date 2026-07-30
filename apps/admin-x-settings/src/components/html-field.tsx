import HtmlEditor, {type HtmlEditorProps} from './html-editor';
import React from 'react';
import clsx from 'clsx';
import {FieldDescription, FieldLabel, inputSurface} from '@tryghost/shade/components';

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
        inputSurface('within'),
        'flex min-h-8 items-center py-1.5 md:min-h-[var(--control-height)]',
        clearBg ? 'bg-transparent' : 'px-3',
        error && 'border-destructive',
        title && !hideTitle && !clearBg && 'mt-2',
        className
    );

    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {title && <FieldLabel className={hideTitle ? 'sr-only' : undefined}>{title}</FieldLabel>}
            <div className={textFieldClasses}>
                <HtmlEditor {...props} value={value} />
            </div>
            {hint && <FieldDescription className={clsx('mt-1', error && 'text-destructive', hintClassName)}>{hint}</FieldDescription>}
        </div>
    );
};

export default HtmlField;
