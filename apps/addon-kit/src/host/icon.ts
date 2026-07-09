import {LucideIcon} from '@tryghost/shade/utils';

/**
 * Manifest icons are kebab-case lucide names ('chart-line'); Lucide exports
 * PascalCase. Unknown or missing icons fall back to the puzzle piece.
 */
export function lucideFromManifest(icon: string | undefined): typeof LucideIcon.Puzzle {
    if (!icon) {
        return LucideIcon.Puzzle;
    }
    const pascal = icon.replace(/(^|-)([a-z0-9])/g, (_, __, letter: string) => letter.toUpperCase());
    const icons = LucideIcon as unknown as Record<string, typeof LucideIcon.Puzzle>;
    return icons[pascal] ?? LucideIcon.Puzzle;
}
