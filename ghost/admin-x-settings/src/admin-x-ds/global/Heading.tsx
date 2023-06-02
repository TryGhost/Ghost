import React from 'react';
import Separator from './Separator';

type THeadingLevels = 1 | 2 | 3 | 4 | 5 | 6;

interface IHeading {
    level?: THeadingLevels;
    children?: React.ReactNode;
    styles?: string;

    /**
     * Only available for Heading 6
     */
    grey?: boolean;
    separator?: boolean;

    /**
     * Uses &lt;label&gt; tag and standardised styling for form labels
     */
    useLabelTag?: boolean;
    className?: string;
}

const Heading: React.FC<IHeading> = ({
    level, 
    children, 
    styles = '', 
    grey, 
    separator, 
    useLabelTag, 
    className = '', 
    ...props
}) => {
    if (!level) {
        level = 1;
    }

    const newElement = `${useLabelTag ? 'label' : `h${level}`}`;
    styles += (level === 6 || useLabelTag) ? (` block text-2xs font-semibold uppercase tracking-wide ${(grey && 'text-grey-700')}`) : ' ';

    const Element = React.createElement(newElement, {className: styles + ' ' + className, key: 'heading-elem', ...props}, children);

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