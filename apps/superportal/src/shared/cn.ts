import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

/**
 * Merge Tailwind class names while resolving conflicts.
 *
 * Implementation matches Shade's cn (apps/shade/src/lib/ds-utils.ts) so the
 * API is identical across the two packages — share an idiom, no surprises.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
