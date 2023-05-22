import React from 'react';

interface HintProps {
    children?: React.ReactNode;
    color?: string;
}

const Hint: React.FC<HintProps> = ({children, color, ...props}) => {
    if (!children) {
        return null;
    }

    return (
        <span className={`mt-1 inline-block text-xs ${color ? `text-${color}` : `text-grey-700`}`} {...props}>{children}</span>
    );
};

export default Hint;
