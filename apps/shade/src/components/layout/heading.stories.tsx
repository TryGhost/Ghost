import type {Meta, StoryObj} from '@storybook/react';
import {H1, H2, H3, H4, HeadingProps} from './heading';

const meta = {
    title: 'Layout / Heading',
    tags: ['autodocs']
} satisfies Meta<HeadingProps>;

export default meta;
type Story = StoryObj<HeadingProps>;

export const HeadingOne = {
    render: (args: Story['args']) => {
        return (
            <H1 {...args}>The Joke Tax Chronicles</H1>
        );
    }
};

export const HeadingTwo = {
    render: (args: Story['args']) => {
        return (
            <H2 {...args}>The Plan</H2>
        );
    }
};

export const HeadingThree = {
    render: (args: Story['args']) => {
        return (
            <H3 {...args}>The Joke Tax</H3>
        );
    }
};

export const HeadingFour = {
    render: (args: Story['args']) => {
        return (
            <H4 {...args}>Jokester Revolt</H4>
        );
    }
};
