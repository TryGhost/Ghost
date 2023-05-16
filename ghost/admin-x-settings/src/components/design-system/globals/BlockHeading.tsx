import React from 'react';

type BlockHeadingColors = 'black' | 'grey';

interface BlockHeadingProps {
    title: string,
    color?: BlockHeadingColors,
    separator?: boolean
}

const BlockHeading: React.FC<BlockHeadingProps> = ({title, color, separator, ...props}) => {
    let styles = '';

    switch (color) {
    case 'grey':
        styles += 'text-grey-700 ';
        break;
    
    default:
        styles += 'text-black ';
        break;
    }

    if (separator) {
        styles += 'pb-1 border-b border-grey-300';
    }

    return (
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${styles}`} {...props}>{title}</h4>
    );
};

export default BlockHeading;