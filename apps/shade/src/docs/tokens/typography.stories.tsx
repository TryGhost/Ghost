import type {Meta, StoryObj} from '@storybook/react-vite';
import {FontFamilies, LeadingScale, TypeScale} from '../showcase/type-scale';

const meta = {
    title: 'Tokens / Typography',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Type tokens: font families, the size ramp, and line-height variables.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const SizeScale: Story = {
    render: () => (
        <TypeScale
            steps={[
                {name: '2xs', cssVar: '--text-2xs'},
                {name: 'xs', cssVar: '--text-xs'},
                {name: 'sm', cssVar: '--text-sm'},
                {name: 'base', cssVar: '--text-base'},
                {name: 'lg', cssVar: '--text-lg'},
                {name: 'xl', cssVar: '--text-xl'},
                {name: '2xl', cssVar: '--text-2xl'},
                {name: '3xl', cssVar: '--text-3xl'},
                {name: '4xl', cssVar: '--text-4xl'},
                {name: '5xl', cssVar: '--text-5xl'},
                {name: '6xl', cssVar: '--text-6xl'},
                {name: '7xl', cssVar: '--text-7xl'}
            ]}
        />
    ),
    parameters: {docs: {description: {story: 'Body copy uses `--text-base`. Larger sizes ship with baked-in line-heights for headings.'}}}
};

export const Families: Story = {
    render: () => (
        <FontFamilies
            families={[
                {name: 'Sans (default UI)', cssVar: '--font-sans'},
                {name: 'Serif (editorial)', cssVar: '--font-serif'},
                {name: 'Mono (code)', cssVar: '--font-mono'}
            ]}
        />
    )
};

export const Leading: Story = {
    render: () => (
        <LeadingScale
            values={[
                {name: 'supertight', cssVar: '--leading-supertight'},
                {name: 'tighter', cssVar: '--leading-tighter'},
                {name: 'tight (heading)', cssVar: '--leading-tight'},
                {name: 'base (body)', cssVar: '--leading-base'}
            ]}
        />
    )
};
