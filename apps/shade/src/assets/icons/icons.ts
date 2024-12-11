import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

// Define the icon styles using CVA
const iconVariants = cva('', {
    variants: {
        size: {
            sm: 'h-3 w-3',
            md: 'h-4 w-4',
            lg: 'h-6 w-6',
            xl: 'h-8 w-8'
        }
    },
    defaultVariants: {
        size: 'md'
    }
});

// Helper to convert kebab-case to PascalCase with numbers
const toPascalCase = (str: string): string => {
    const processed = str
        .replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
    return processed.charAt(0).toUpperCase() + processed.slice(1);
};

// Define props interface for icons
interface IconProps extends
    React.SVGProps<SVGSVGElement>,
    VariantProps<typeof iconVariants> {
        className?: string;
}

const iconModules = import.meta.glob<{ReactComponent: React.FC<IconProps> }>(
    './*.svg',
    {eager: true}
);

const Icon = Object.entries(iconModules).reduce((acc, [path, module]) => {
    const kebabName = path.match(/\.\/(.+)\.svg/)?.[1] ?? '';
    const iconName = toPascalCase(kebabName);

    acc[iconName] = (props: IconProps) => {
        const {size, className, ...rest} = props;
        const iconClassName = cn(iconVariants({size, className}));
        return React.createElement(module.ReactComponent, {...rest,
            className: iconClassName});
    };
    return acc;
}, {} as Record<string, React.FC<IconProps>>);

export type IconName = keyof typeof Icon;

export const IconComponents = Icon;
export default Icon;