import React from 'react';
import clsx from 'clsx';

interface FormProps {
    gap?: 'sm' | 'md' | 'lg';
    marginTop?: boolean;
    marginBottom?: boolean;
    children?: React.ReactNode;
}

/**
 * A container to group form elements
 */
const Form: React.FC<FormProps> = ({
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

    return (
        <div className={classes}>
            {children}
        </div>
    );
};

export default Form;