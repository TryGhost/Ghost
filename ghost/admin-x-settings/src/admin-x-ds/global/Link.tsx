import React from 'react';

interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
    href: string;

    /**
     * Tailwind color name
     */
    color?: string;
    classes?: string;
    children?: React.ReactNode;
}

/**
 * Standard link with default styling
 */
const Link: React.FC<LinkProps> = ({href, color, classes, children, ...props}) => {
    if (!color) {
        color = 'green';
    }

    let styles = (color === 'black') ? `transition text-black hover:text-black-700 ${classes}` : `text-${color} hover:text-${color}-400 ${classes}`;

    return <a className={styles} href={href} {...props}>{children}</a>;
};

export default Link;