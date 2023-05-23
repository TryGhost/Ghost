import type {Meta, StoryObj} from '@storybook/react';

const Component = () => null;

const meta = {
    title: 'Meta / Boilerplate story',
    component: Component,
    tags: ['autodocs']
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
    args: {}
};
