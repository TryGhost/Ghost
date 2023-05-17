import React from 'react';
import Separator from './Separator';

type THeadingLevels = 1 | 2 | 3 | 4 | 5 | 6;

interface IHeading {
    level?: THeadingLevels;
    children?: React.ReactNode;
    grey?: boolean;
    separator?: boolean;
}

const Heading: React.FC<IHeading> = ({level, children, grey, separator, ...props}) => {
    if (!level) {
        level = 1;
    }

    const newElement = `h${level}`;
    let styles = (level === 6) ? (`text-2xs font-semibold uppercase tracking-wide ${(grey && 'text-grey-700')}`) : '';

    const Element = React.createElement(newElement, {className: styles, ...props}, children);

    if (separator) {
        let gap = (!level || level === 1) ? 2 : 1;
        let bottomMargin = (level === 6) ? 2 : 3;
        return (
            <div className={`gap-${gap} mb-${bottomMargin} flex flex-col`}>
                {Element}
                <Separator />
            </div>
        );
    } else {
        return Element;
    }
};

export default Heading;