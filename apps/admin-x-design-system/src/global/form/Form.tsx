import clsx from 'clsx';
import React from 'react';
import Heading from '../Heading';

export interface FormProps {
    title?: string;
    grouped?: boolean;
    gap?: 'none' | 'sm' | 'md' | 'lg';
    margins?: 'none' | 'sm' | 'md' | 'lg';
    marginTop?: boolean;
    marginBottom?: boolean;
    className?: string;
    children?: React.ReactNode;
}

/**
 * A container to group form elements
 */
const Form: React.FC<FormProps> = ({
    title,
    grouped = false,
    gap = 'md',
    margins = 'md',
    marginTop = false,
    marginBottom = true,
    className = '',
    children
}) => {
    let classes = clsx(
        'flex flex-col',
        (gap === 'sm' && 'gap-6'),
        (gap === 'md' && 'gap-8'),
        (gap === 'lg' && 'gap-11')
    );

    if (!margins) {
        margins = gap;
    }

    if (marginBottom) {
        classes = clsx(
            classes,
            (margins === 'sm' && 'mb-7'),
            (margins === 'md' && 'mb-11'),
            (margins === 'lg' && 'mb-14')
        );
    }

    if (marginTop) {
        classes = clsx(
            classes,
            (margins === 'sm' && 'mt-7'),
            (margins === 'md' && 'mt-11'),
            (margins === 'lg' && 'mt-14')
        );
    }

    if (grouped) {
        classes = clsx(
            classes,
            'rounded-sm border border-grey-200 p-4 dark:border-grey-900 md:p-7'
        );
    }

    const titleClasses = clsx(
        grouped ? 'mb-3' : 'mb-4'
    );

    if (grouped || title) {
        return (
            <div className={className}>
                {title && <Heading className={titleClasses} level={5}>{title}</Heading>}
                <div className={classes}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={classes + className}>
            {children}
        </div>
    );
};

export default Form;
