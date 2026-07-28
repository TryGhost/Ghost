import HtmlEditor, {type HtmlEditorProps} from './html-editor';
import React from 'react';
import clsx from 'clsx';
import {FieldLabel, inputSurface} from '@tryghost/shade/components';

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
            {/* Deliberately not FieldDescription: its positional margin rules
                (last:mt-0) zero the gap when the hint is the last child, leaving
                HtmlField hints tighter than TextField's LegacyHint (mt-1). Same
                classes as LegacyHint so the two field types stay in step. */}
            {hint && <p className={clsx('mt-1 text-sm leading-normal font-normal', error ? 'text-destructive' : 'text-muted-foreground', hintClassName)}>{hint}</p>}
        </div>
    );
};

export default HtmlField;
