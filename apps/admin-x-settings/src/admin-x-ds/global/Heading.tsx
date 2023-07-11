import React from 'react';
import Separator from './Separator';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingBaseProps {
    level?: HeadingLevel;
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

type Heading1to5Props = {
    useLabelTag?: false,
    level?: Exclude<HeadingLevel, 6>,
    grey?: never
} & HeadingBaseProps & React.HTMLAttributes<HTMLHeadingElement>

type Heading6Props = {
    useLabelTag?: false,
    level: 6,
    grey?: boolean } & HeadingBaseProps & React.HTMLAttributes<HTMLHeadingElement>

type HeadingLabelProps = {
    useLabelTag: true,
    level?: never,
    grey?: boolean } & HeadingBaseProps & React.LabelHTMLAttributes<HTMLLabelElement>

export const Heading6Styles = 'text-2xs font-semibold uppercase tracking-wider';

const Heading: React.FC<Heading1to5Props | Heading6Props | HeadingLabelProps> = ({
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
    styles += (level === 6 || useLabelTag) ? (` block text-2xs ${Heading6Styles} ${(grey && 'text-grey-700')}`) : ' ';

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
