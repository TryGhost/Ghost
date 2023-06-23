import React from 'react';

interface SeparatorProps {
    className?: string;
}

const Separator: React.FC<SeparatorProps> = ({className = 'border-grey-300'}) => {
    return <hr className={className} />;
};

export default Separator;