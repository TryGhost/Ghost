import type {Meta, StoryObj} from '@storybook/react-vite';
import {BreakpointTable} from '../showcase/breakpoint-table';

const meta = {
    title: 'Tokens / Breakpoints',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Responsive breakpoints. Use Tailwind responsive variants (`md:`, `lg:`…) backed by these tokens — don\'t hardcode pixel widths.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Scale: Story = {
    render: () => (
        <BreakpointTable
            breakpoints={[
                {name: 'sm', cssVar: '--breakpoint-sm'},
                {name: 'md', cssVar: '--breakpoint-md'},
                {name: 'sidebar', cssVar: '--breakpoint-sidebar'},
                {name: 'tablet', cssVar: '--breakpoint-tablet'},
                {name: 'lg', cssVar: '--breakpoint-lg'},
                {name: 'sidebarlg', cssVar: '--breakpoint-sidebarlg'},
                {name: 'xl', cssVar: '--breakpoint-xl'},
                {name: 'xxl', cssVar: '--breakpoint-xxl'},
                {name: 'xxxl', cssVar: '--breakpoint-xxxl'}
            ]}
        />
    )
};
