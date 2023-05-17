import React from 'react';

type THeadingLevels = 1 | 2 | 3 | 4 | 5 | 6;

interface IHeading {
    level?: THeadingLevels;
    children?: React.ReactNode;
    grey?: boolean;
}

const Heading: React.FC<IHeading> = ({level, children, grey, ...props}) => {
    const newElement = level ? `h${level}` : 'h1';

    let styles = '';

    switch (level) {
    case 6:
        styles += 'text-xs font-semibold uppercase tracking-wide ';
        styles += grey && 'text-grey-700';
        break;
    
    default:
        break;
    }

    return React.createElement(newElement, {className: styles, ...props}, children);
};

export default Heading;