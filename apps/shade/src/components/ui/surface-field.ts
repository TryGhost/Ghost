import {cn} from '@/lib/utils';

/**
 * Shared visual recipe for input-like surfaces (Input, Textarea, InputGroup, Select trigger).
 *
 * - `'self'` — apply directly to the focusable element (e.g. <input>, <textarea>, <button>).
 * - `'within'` — apply to a wrapper that contains a focusable child; focus and invalid
 *   styles are derived from the child via `:has()` selectors.
 *
 * The recipe owns: border, background, radius, transition, focus ring, invalid state.
 * Consumers add their own size, padding, typography, and component-specific tweaks.
 *
 * @example
 *   // Direct on a focusable element
 *   <input className={cn(surfaceField('self'), 'h-9 px-3 ...')} />
 *
 *   // Wrapper that has a focusable child
 *   <div className={cn(surfaceField('within'), 'flex h-9 items-center ...')}>
 *     <input ... />
 *   </div>
 */
export function surfaceField(mode: 'self' | 'within' = 'self') {
    const base = 'rounded-md border border-border-default bg-surface-elevated transition-colors';

    const focusSelf =
        'focus-visible:outline-hidden focus-visible:bg-transparent focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/25';
    const focusWithin =
        'has-[:focus-visible]:outline-hidden has-[:focus-visible]:bg-transparent has-[:focus-visible]:border-focus-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring/25';

    const invalidSelf =
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 dark:aria-[invalid=true]:ring-destructive/40';
    const invalidWithin =
        'has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20 dark:has-[[aria-invalid=true]]:ring-destructive/40';

    const disabledSelf = 'disabled:cursor-not-allowed disabled:opacity-50';

    return cn(
        base,
        mode === 'self' ? focusSelf : focusWithin,
        mode === 'self' ? invalidSelf : invalidWithin,
        mode === 'self' && disabledSelf
    );
}
