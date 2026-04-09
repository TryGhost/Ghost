import {cn} from '@/lib/utils';
import React from 'react';

type TextElement =
    | 'p'
    | 'span'
    | 'div'
    | 'label'
    | 'small'
    | 'strong'
    | 'em'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6';

type TextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
type TextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse';
type TextLeading = 'none' | 'snug' | 'normal' | 'relaxed' | 'tight' | 'tighter' | 'supertight' | 'body' | 'heading';

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
    '2xs': 'text-2xs',
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-md',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
};

const TEXT_WEIGHT_CLASSES: Record<TextWeight, string> = {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
};

const TEXT_TONE_CLASSES: Record<TextTone, string> = {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    tertiary: 'text-text-tertiary',
    inverse: 'text-text-inverse'
};

const TEXT_LEADING_CLASSES: Record<TextLeading, string> = {
    none: 'leading-none',
    snug: 'leading-snug',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    tight: 'leading-tight',
    tighter: 'leading-tighter',
    supertight: 'leading-supertight',
    body: 'leading-body',
    heading: 'leading-heading'
};

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
    as?: TextElement;
    size?: TextSize;
    weight?: TextWeight;
    tone?: TextTone;
    leading?: TextLeading;
    truncate?: boolean;
}

const Text = React.forwardRef<HTMLElement, TextProps>(
    function Text({
        as = 'p',
        className,
        size = 'md',
        weight = 'regular',
        tone = 'primary',
        leading = 'body',
        truncate = false,
        ...props
    }: TextProps, ref) {
        const Component = as as React.ElementType;

        return (
            <Component
                ref={ref}
                className={cn(
                    TEXT_SIZE_CLASSES[size],
                    TEXT_WEIGHT_CLASSES[weight],
                    TEXT_TONE_CLASSES[tone],
                    TEXT_LEADING_CLASSES[leading],
                    truncate && 'truncate',
                    className
                )}
                {...props}
            />
        );
    }
);

Text.displayName = 'Text';

export {Text};
export type {
    TextElement,
    TextLeading,
    TextSize,
    TextTone,
    TextWeight
};
