import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn, kebabToPascalCase} from '@/lib/utils';

const iconVariants = cva('', {
    variants: {
        size: {
            sm: 'size-3',
            md: 'size-4',
            lg: 'size-6',
            xl: 'size-8'
        }
    },
    defaultVariants: {
        size: 'md'
    }
});

interface IconProps extends
    React.SVGProps<SVGSVGElement>,
    VariantProps<typeof iconVariants> {
        className?: string;
}

const iconModules = import.meta.glob<{ReactComponent: React.FC<IconProps> }>(
    '../../assets/icons/*.svg',
    {eager: true}
);

const Icon = Object.entries(iconModules).reduce((acc, [path, module]) => {
    const kebabName = path.match(/[^/]+(?=\.svg$)/)?.[0] ?? '';
    const iconName = kebabToPascalCase(kebabName);

    const IconComponent = (props: IconProps) => {
        const {size, className, ...rest} = props;
        const iconClassName = cn(iconVariants({size, className}));
        return React.createElement(module.ReactComponent, {
            ...rest,
            className: iconClassName
        });
    };

    IconComponent.displayName = `Icon.${iconName}`;

    acc[iconName] = IconComponent;
    return acc;
}, {} as Record<string, React.FC<IconProps>>);

export type IconName = keyof typeof Icon;

export const IconComponents = Icon;
export default Icon;
