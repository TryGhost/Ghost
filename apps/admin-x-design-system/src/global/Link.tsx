import React from 'react';

export interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
    href: string;

    /**
     * Tailwind color name
     */
    color?: string;
    children?: React.ReactNode;
    className?: string;
}

/**
 * Standard link with default styling
 */
const Link: React.FC<LinkProps> = ({href, color, className, children, ...props}) => {
    if (!color) {
        color = 'green';
    }

    let styles = (color === 'black') ? `transition text-black hover:text-black-700` : `text-${color} hover:text-${color}-400`;

    if (className) {
        styles = `${styles} ${className}`;
    }

    return <a className={styles} href={href} {...props}>{children}</a>;
};

export default Link;
