import React from 'react';

interface HintProps {
    children?: React.ReactNode;
    color?: string;
    className?: string;
}

const Hint: React.FC<HintProps> = ({children, color, className, ...props}) => {
    if (!children) {
        return null;
    }

    return (
        <span className={`mt-1 inline-block text-xs ${color ? `text-${color}` : `text-grey-700`} ${className}`} {...props}>{children}</span>
    );
};

export default Hint;
