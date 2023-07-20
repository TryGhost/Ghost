import Heading from '../Heading';
import React from 'react';
import clsx from 'clsx';

interface FormProps {
    title?: string;
    grouped?: boolean;
    gap?: 'none' | 'sm' | 'md' | 'lg';
    marginTop?: boolean;
    marginBottom?: boolean;
    children?: React.ReactNode;
}

/**
 * A container to group form elements
 */
const Form: React.FC<FormProps> = ({
    title,
    grouped = false,
    gap = 'md',
    marginTop = false,
    marginBottom = true,
    children
}) => {
    let classes = clsx(
        'flex flex-col',
        (gap === 'sm' && 'gap-4'),
        (gap === 'md' && 'gap-8'),
        (gap === 'lg' && 'gap-11')
    );

    if (marginBottom) {
        classes = clsx(
            classes,
            (gap === 'sm' && 'mb-4'),
            (gap === 'md' && 'mb-8'),
            (gap === 'lg' && 'mb-11')
        );
    }

    if (marginTop) {
        classes = clsx(
            classes,
            (gap === 'sm' && 'mt-4'),
            (gap === 'md' && 'mt-8'),
            (gap === 'lg' && 'mt-11')
        );
    }

    if (grouped) {
        classes = clsx(
            classes,
            'rounded-sm border border-grey-200 p-7'
        );
    }

    let titleClasses = clsx(
        grouped ? 'mb-2' : 'mb-4'
    );

    return (
        <div className={classes}>
            {title && <Heading className={titleClasses} level={5}>{title}</Heading>}
            {children}
        </div>
    );
};

export default Form;