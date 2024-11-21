import clsx from 'clsx';
import React from 'react';
import Separator from './Separator';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

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

export const Heading6Styles = clsx('text-sm font-medium tracking-normal');
export const Heading6StylesGrey = clsx(
    Heading6Styles,
    'text-grey-900 dark:text-grey-500'
);

export type HeadingProps = Heading1to5Props | Heading6Props | HeadingLabelProps

const Heading: React.FC<HeadingProps> = ({
    level = 1,
    children,
    styles = '',
    grey = true,
    separator,
    useLabelTag,
    className = '',
    ...props
}) => {
    const newElement = `${useLabelTag ? 'label' : `h${level}`}`;
    styles += (level === 6 || useLabelTag) ? (` block ${grey ? Heading6StylesGrey : Heading6Styles}`) : ' ';

    if (!useLabelTag) {
        switch (level) {
        case 1:
            styles += ' md:text-4xl leading-tighter';
            break;
        case 2:
            styles += ' md:text-3xl';
            break;
        case 3:
            styles += ' md:text-2xl';
            break;
        case 4:
            styles += ' md:text-xl';
            break;
        case 5:
            styles += ' md:text-lg';
            break;
        default:
            break;
        }
    }

    className = clsx(
        styles,
        !grey && 'dark:text-white',
        className
    );

    const Element = React.createElement(newElement, {className: className, key: 'heading-elem', ...props}, children);

    if (separator) {
        const gap = (!level || level === 1) ? 2 : 1;
        const bottomMargin = (level === 6) ? 2 : 3;
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
