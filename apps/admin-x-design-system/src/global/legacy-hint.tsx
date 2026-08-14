import clsx from 'clsx';
import React from 'react';

export interface LegacyHintProps extends React.HTMLAttributes<HTMLDivElement> {
    error?: boolean;
}

const LegacyHint: React.FC<LegacyHintProps> = ({children, error = false, className, ...props}) => {
    if (!children) {
        return null;
    }

    return (
        <div
            className={clsx(
                'font-normal',
                error ? 'text-control text-destructive' : 'text-sm leading-normal text-muted-foreground',
                className
            )}
            data-slot={error ? 'field-error' : 'field-description'}
            role={error ? 'alert' : undefined}
            {...props}
        >
            {children}
        </div>
    );
};

export default LegacyHint;
