import {cn} from '@/lib/utils';

/**
 * Shared visual recipe for input-like surfaces (Input, Textarea, InputGroup, Select trigger).
 *
 * The recipe owns: border, background, radius, transition, focus ring, invalid state.
 * Consumers add their own size, padding, typography, and component-specific tweaks.
 *
 * `inputSurface()` covers the two common shapes:
 * - `'self'` — apply directly to the focusable element (e.g. <input>, <textarea>, <button>).
 * - `'within'` — apply to a wrapper that contains a focusable child; focus and invalid
 *   styles are derived from any focusable descendant via `:has()`.
 *
 * For unusual cases (e.g. a wrapper that should only react to a specific control element,
 * not any focusable descendant) compose `inputSurfaceClasses` atoms manually.
 *
 * @example
 *   // Direct on a focusable element
 *   <input className={cn(inputSurface('self'), 'h-9 px-3 ...')} />
 *
 *   // Wrapper with any focused descendant driving focus state
 *   <div className={cn(inputSurface('within'), 'flex h-9 items-center ...')}>
 *     <input ... />
 *   </div>
 *
 *   // Custom scope: only one specific child triggers focus state. Compose from atoms
 *   // so Tailwind can statically detect the literal class string.
 *   <div className={cn(
 *     inputSurfaceClasses.base,
 *     inputSurfaceClasses.invalidWithin,
 *     // literal class string for Tailwind JIT to pick up
 *     'has-[[data-slot=control]:focus-visible]:border-focus-ring ...'
 *   )} />
 */
export const inputSurfaceClasses = {
    base: 'rounded-md border border-border-default bg-surface-elevated transition-colors',
    focusSelf:
        'focus-visible:outline-hidden focus-visible:bg-transparent focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/25',
    focusWithin:
        'has-[:focus-visible]:outline-hidden has-[:focus-visible]:bg-transparent has-[:focus-visible]:border-focus-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring/25',
    invalidSelf:
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 dark:aria-[invalid=true]:ring-destructive/40',
    invalidWithin:
        'has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20 dark:has-[[aria-invalid=true]]:ring-destructive/40',
    disabledSelf: 'disabled:cursor-not-allowed disabled:opacity-50'
} as const;

export function inputSurface(mode: 'self' | 'within' = 'self') {
    if (mode === 'self') {
        return cn(
            inputSurfaceClasses.base,
            inputSurfaceClasses.focusSelf,
            inputSurfaceClasses.invalidSelf,
            inputSurfaceClasses.disabledSelf
        );
    }
    return cn(
        inputSurfaceClasses.base,
        inputSurfaceClasses.focusWithin,
        inputSurfaceClasses.invalidWithin
    );
}
