import type {Meta, StoryObj} from '@storybook/react-vite';
import {ShadowGrid} from '../showcase/shadow-grid';

const meta = {
    title: 'Tokens / Shadows',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Elevation tokens. Most surfaces are flat or use `--shadow-sm`; heavier shadows are reserved for popovers, modals, and dropdowns.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Scale: Story = {
    render: () => (
        <ShadowGrid
            shadows={[
                {name: 'xs', cssVar: '--shadow-xs'},
                {name: 'sm', cssVar: '--shadow-sm'},
                {name: 'default', cssVar: '--shadow'},
                {name: 'md', cssVar: '--shadow-md'},
                {name: 'md-heavy', cssVar: '--shadow-md-heavy'},
                {name: 'lg', cssVar: '--shadow-lg'},
                {name: 'xl', cssVar: '--shadow-xl'},
                {name: 'inner', cssVar: '--shadow-inner'}
            ]}
        />
    )
};
