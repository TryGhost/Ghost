import clsx from 'clsx';
import React from 'react';

const icons: Record<string, {ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>}> = import.meta.glob('../assets/icons/*.svg', {eager: true});

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom' | number;

export interface IconProps {
    name: string;

    /**
     * Accepts either predefined sizes or number, in which case the size means the pixel width & height
     */
    size?: IconSize;

    /**
     * Accepts all colors available in the actual TailwindCSS theme, e.g. `black`, `green-100`
     */
    colorClass?: string;
    styles?: string;
    className?: string;
}

/**
 * Icon guidelines:
 * - all icons must be SVG's
 * - all icons must have all it's children color value set `currentColor`
 * - all strokes must be paths and _NOT_ outlined objects. Stroke width should be set to 1.5px
 */
const Icon: React.FC<IconProps> = ({name, size = 'md', colorClass = '', className = ''}) => {
    const {ReactComponent: SvgComponent} = icons[`../assets/icons/${name}.svg`];

    let styles = '';

    if (!styles) {
        switch (size) {
        case 'custom':
            break;
        case 'xs':
            styles = 'w-3 h-3';
            break;
        case 'sm':
            styles = 'w-4 h-4';
            break;
        case 'lg':
            styles = 'w-8 h-8';
            break;
        case 'xl':
            styles = 'w-10 h-10';
            break;

        default:
            styles = 'w-5 h-5';
            break;
        }
    }

    styles = clsx(
        styles,
        colorClass
    );

    if (SvgComponent) {
        return (
            <SvgComponent className={`pointer-events-none ${styles} ${className}`} />
        );
    }
    return null;
};

export default Icon;
