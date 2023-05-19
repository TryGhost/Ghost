import React from 'react';

interface HintProps {
    children?: React.ReactNode;
    color?: string;
}

const Hint: React.FC<HintProps> = ({children, color, ...props}) => {
    if (!children) {
        return null;
    }

    if (typeof children === 'string') {
        return (
            <span className={`mt-2 inline-block text-xs ${color ? `text-${color}` : `text-grey-700`}`} {...props}>{children}</span>
        );
    }

    if (React.isValidElement(children)) {
        return (
            <>{children}</>
        );
    }

    return null;
};

export default Hint;
