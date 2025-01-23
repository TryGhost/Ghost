import type {Meta, StoryObj} from '@storybook/react';
import {Avatar, AvatarFallback, AvatarImage} from './avatar';

const meta = {
    title: 'Components / Avatar',
    component: Avatar,
    tags: ['autodocs'],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
    args: {
        children: <AvatarFallback>AG</AvatarFallback>
    }
};

export const WithImage: Story = {
    args: {
        children: (
            <>
                <AvatarImage src="https://avatars.githubusercontent.com/u/2178663?s=200&v=4" />
                <AvatarFallback>AG</AvatarFallback>
            </>
        )
    }
};
