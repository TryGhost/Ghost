import React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

export interface SeparatorProps {
    className?: string;
}

const Separator: React.FC<SeparatorProps> = ({className}) => {
    if (!className) {
        className = 'border-grey-200 dark:border-grey-800';
    }
    return (
        <SeparatorPrimitive.Root asChild decorative>
            <hr className={className} />
        </SeparatorPrimitive.Root>
    );
};

export default Separator;
