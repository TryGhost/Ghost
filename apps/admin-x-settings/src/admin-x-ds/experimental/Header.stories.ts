import {Header} from './Header';
import type {Meta, StoryObj} from '@storybook/react';

const meta = {
    title: 'Experimental / Header',
    component: Header,
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
    tags: ['autodocs'],
    parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
        layout: 'fullscreen'
    }
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
    args: {
        user: {
            name: 'Jane Doe'
        }
    }
};

export const LoggedOut: Story = {};
