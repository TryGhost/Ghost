import type {Meta, StoryObj} from '@storybook/react-vite';
import {cn} from '@/lib/utils';
import {surfaceField, surfaceFieldClasses} from './surface-field';

/**
 * Docs-only Storybook entry for the `surfaceField` recipe.
 * Lives under "Foundations" rather than "Components" because there's no component to render —
 * just a shared visual recipe that powers Input, Textarea, InputGroup and the Select trigger.
 */
const meta: Meta = {
    title: 'Foundations / Surface Field',
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Shared visual recipe for input-like surfaces. The same border, background, radius, focus ring, and invalid state used by every form control in Shade. Use `surfaceField(\'self\')` when applying directly to a focusable element (`<input>`, `<textarea>`, `<button>`). Use `surfaceField(\'within\')` when applying to a wrapper that contains a focusable child — the focus and invalid styles are derived from the descendant via `:has()` selectors. For unusual cases that need a custom focus scope (e.g. only one specific control should trigger the surface focus ring), compose `surfaceFieldClasses` atoms manually. Live consumers: `Components / Input`, `Components / Textarea`, `Components / InputGroup`, `Components / Select`.'
            }
        }
    }
};

export default meta;
type Story = StoryObj;

const inputBase = 'h-9 w-[280px] px-3 text-base placeholder:text-muted-foreground';

export const Self: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Recipe applied directly to a focusable element. Used by `Input`, `Textarea`, and the `Select` trigger.'
            }
        }
    },
    render: () => (
        <input
            className={cn(surfaceField('self'), inputBase)}
            placeholder='Tab to focus me'
        />
    )
};

export const Within: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Recipe applied to a wrapper that contains a focusable child. The wrapper itself has no focus, but the focus ring lights up when any descendant becomes `:focus-visible`.'
            }
        }
    },
    render: () => (
        <div className={cn(surfaceField('within'), 'flex w-[280px] items-center gap-2 px-3')}>
            <span className='text-sm text-muted-foreground'>$</span>
            <input
                className='h-9 grow bg-transparent outline-hidden placeholder:text-muted-foreground'
                placeholder='Amount'
            />
        </div>
    )
};

export const States: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default, invalid (`aria-invalid="true"`), and disabled states for `\'self\'` mode.'
            }
        }
    },
    render: () => (
        <div className='flex flex-col gap-3'>
            <input
                className={cn(surfaceField('self'), inputBase)}
                placeholder='Default'
            />
            <input
                className={cn(surfaceField('self'), inputBase)}
                placeholder='Invalid'
                aria-invalid
            />
            <input
                className={cn(surfaceField('self'), inputBase)}
                placeholder='Disabled'
                disabled
            />
        </div>
    )
};

export const WithinStates: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default and invalid states for `\'within\'` mode. Disabled state is left to the wrapper consumer (the recipe doesn\'t handle disabled in `within` mode since wrappers aren\'t themselves disableable).'
            }
        }
    },
    render: () => (
        <div className='flex flex-col gap-3'>
            <div className={cn(surfaceField('within'), 'flex w-[280px] items-center px-3')}>
                <input
                    className='h-9 grow bg-transparent outline-hidden placeholder:text-muted-foreground'
                    placeholder='Default'
                />
            </div>
            <div className={cn(surfaceField('within'), 'flex w-[280px] items-center px-3')}>
                <input
                    className='h-9 grow bg-transparent outline-hidden placeholder:text-muted-foreground'
                    placeholder='Invalid'
                    aria-invalid
                />
            </div>
        </div>
    )
};

export const CustomFocusScope: Story = {
    parameters: {
        docs: {
            description: {
                story: 'For wrappers that should only react to a specific descendant (e.g. `InputGroup`, where focusing a button inside the group must NOT trigger the surface ring), compose `surfaceFieldClasses` atoms with a literal `has-[…]:` selector. The literal class string is required so Tailwind can detect it at build time.'
            }
        }
    },
    render: () => (
        <div className='flex flex-col gap-3'>
            <div
                className={cn(
                    surfaceFieldClasses.base,
                    surfaceFieldClasses.invalidWithin,
                    'has-[[data-slot=control]:focus-visible]:outline-hidden has-[[data-slot=control]:focus-visible]:bg-transparent has-[[data-slot=control]:focus-visible]:border-focus-ring has-[[data-slot=control]:focus-visible]:ring-2 has-[[data-slot=control]:focus-visible]:ring-focus-ring/25',
                    'flex w-[320px] items-center gap-2 px-3 outline-hidden'
                )}
            >
                <input
                    className='h-9 grow bg-transparent outline-hidden placeholder:text-muted-foreground'
                    data-slot='control'
                    placeholder='Focus me — ring lights up'
                />
                <button
                    className='shrink-0 rounded-sm bg-muted px-2 py-1 text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring/25 focus-visible:outline-hidden'
                    type='button'
                >
                    Focus me — no ring
                </button>
            </div>
        </div>
    )
};

export const WhatTheRecipeOwns: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Where the line is between the recipe and the consumer. Keep size, padding, and typography concerns out of the recipe.'
            }
        }
    },
    render: () => (
        <table className='border-collapse text-left text-sm [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2'>
            <thead>
                <tr>
                    <th>Owned by `surfaceField`</th>
                    <th>Owned by the consumer</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Border (color + width)</td>
                    <td>Height (`h-9`, `min-h-*`, etc.)</td>
                </tr>
                <tr>
                    <td>Background</td>
                    <td>Padding (`px-3`, `py-1`, etc.)</td>
                </tr>
                <tr>
                    <td>Border radius</td>
                    <td>Typography (font size, line clamp)</td>
                </tr>
                <tr>
                    <td>Focus ring (color, width, blur)</td>
                    <td>Placeholder color</td>
                </tr>
                <tr>
                    <td>Invalid state (border + ring)</td>
                    <td>Hover state (e.g. `Select` trigger)</td>
                </tr>
                <tr>
                    <td>Disabled state (in &apos;self&apos; mode)</td>
                    <td>Layout (flex, alignment, slots)</td>
                </tr>
                <tr>
                    <td>Transition</td>
                    <td>Component-specific tweaks</td>
                </tr>
            </tbody>
        </table>
    )
};
