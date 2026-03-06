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

type IconModule = {
    ReactComponent?: React.FC<IconProps>;
    default?: string;
};

const iconModules = import.meta.glob<IconModule>(
    '../../assets/icons/*.svg',
    {eager: true}
);

const Icon = Object.entries(iconModules).reduce((acc, [path, module]) => {
    const kebabName = path.match(/[^/]+(?=\.svg$)/)?.[0] ?? '';
    const iconName = kebabToPascalCase(kebabName);

    const IconComponent = (props: IconProps) => {
        const {size, className, ...rest} = props;
        const iconClassName = cn(iconVariants({size, className}));
        if (module.ReactComponent) {
            return React.createElement(module.ReactComponent, {
                ...rest,
                className: iconClassName
            });
        }

        if (module.default) {
            return React.createElement('img', {
                alt: '',
                'aria-hidden': 'true',
                className: iconClassName,
                src: module.default
            });
        }

        return null;
    };

    IconComponent.displayName = `Icon.${iconName}`;

    acc[iconName] = IconComponent;
    return acc;
}, {} as Record<string, React.FC<IconProps>>);

export type IconName = keyof typeof Icon;

export const IconComponents = Icon;
export default Icon;
