import React from 'react';

// Helper to convert kebab-case to PascalCase with numbers
const toPascalCase = (str: string): string => {
    const processed = str
        .replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
    return processed.charAt(0).toUpperCase() + processed.slice(1);
};

// Define props interface for icons
interface IconProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

const iconModules = import.meta.glob<{ReactComponent: React.FC<IconProps> }>(
    './*.svg',
    {eager: true}
);

const Icon = Object.entries(iconModules).reduce((acc, [path, module]) => {
    const kebabName = path.match(/\.\/(.+)\.svg/)?.[1] ?? '';
    const iconName = toPascalCase(kebabName);

    acc[iconName] = module.ReactComponent;
    return acc;
}, {} as Record<string, React.FC<IconProps>>);

export type IconName = keyof typeof Icon;

export const IconComponents = Icon;
export default Icon;