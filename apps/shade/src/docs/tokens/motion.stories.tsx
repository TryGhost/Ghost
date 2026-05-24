import type {Meta, StoryObj} from '@storybook/react-vite';
import {AnimationGallery, DurationScale, EasingScale} from '../showcase/motion-gallery';

const meta = {
    title: 'Tokens / Motion',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Durations, easings, and named animations. Compose `--duration-*` with `--ease-*` for custom transitions; reuse named animations for common entrances.'
            }
        }
    }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Durations: Story = {
    render: () => (
        <DurationScale
            durations={[
                {name: 'fast (hover, micro-feedback)', cssVar: '--duration-fast'},
                {name: 'base (most transitions)', cssVar: '--duration-base'},
                {name: 'slow (modal, page-level)', cssVar: '--duration-slow'}
            ]}
        />
    )
};

export const Easings: Story = {
    render: () => (
        <EasingScale
            easings={[
                {name: 'standard', cssVar: '--ease-standard'},
                {name: 'emphasized', cssVar: '--ease-emphasized'}
            ]}
        />
    )
};

export const NamedAnimations: Story = {
    render: () => (
        <AnimationGallery
            animations={[
                {name: 'fade-in', cssVar: '--animate-fade-in'},
                {name: 'modal-in', cssVar: '--animate-modal-in'},
                {name: 'modal-in-from-right', cssVar: '--animate-modal-in-from-right'},
                {name: 'toaster-in', cssVar: '--animate-toaster-in'},
                {name: 'toaster-top-in', cssVar: '--animate-toaster-top-in'},
                {name: 'accordion-down', cssVar: '--animate-accordion-down'}
            ]}
        />
    ),
    parameters: {docs: {description: {story: 'Pre-built animations for common entrances. Click any card to replay.'}}}
};
