import React from 'react';

interface SeparatorProps {
    className?: string;
}

const Separator: React.FC<SeparatorProps> = ({className}) => {
    if (!className) {
        className = 'border-grey-200 dark:border-grey-600';
    }
    return <hr className={className} />;
};

export default Separator;