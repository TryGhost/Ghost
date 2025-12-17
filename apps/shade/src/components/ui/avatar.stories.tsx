import type {Meta, StoryObj} from '@storybook/react-vite';
import {Avatar, AvatarFallback, AvatarImage} from './avatar';
import {User} from 'lucide-react';

const meta = {
    title: 'Components / Avatar',
    component: Avatar,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Display user profile images with fallback initials when images fail to load. Built on Radix UI primitives with consistent sizing and styling.'
            }
        }
    },
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

export const BrokenImage: Story = {
    args: {
        children: (
            <>
                <AvatarImage src="https://broken-url.example.com/image.jpg" />
                <AvatarFallback>BU</AvatarFallback>
            </>
        )
    }
};

export const IconAsFallback: Story = {
    args: {
        children: (
            <>
                <AvatarImage src="https://broken-url.example.com/image.jpg" />
                <AvatarFallback><User /></AvatarFallback>
            </>
        )
    }
};

export const DifferentSizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar size="xs">
                <AvatarFallback size="xs">XS</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
                <AvatarFallback size="sm">SM</AvatarFallback>
            </Avatar>
            <Avatar size="default">
                <AvatarFallback size="default">MD</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
                <AvatarFallback size="lg">LG</AvatarFallback>
            </Avatar>
            <Avatar size="xl">
                <AvatarFallback size="xl">XL</AvatarFallback>
            </Avatar>
        </div>
    )
};

export const ExtraSmall: Story = {
    args: {
        size: 'xs',
        children: <AvatarFallback size="xs">XS</AvatarFallback>
    }
};

export const Small: Story = {
    args: {
        size: 'sm',
        children: <AvatarFallback size="sm">SM</AvatarFallback>
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        children: <AvatarFallback size="lg">LG</AvatarFallback>
    }
};

export const ExtraLarge: Story = {
    args: {
        size: 'xl',
        children: <AvatarFallback size="xl">XL</AvatarFallback>
    }
};

export const MultipleAvatars: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Avatar>
                <AvatarImage src="https://avatars.githubusercontent.com/u/2178663?s=200&v=4" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarImage src="https://avatars.githubusercontent.com/u/124599?s=200&v=4" />
                <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback>CD</AvatarFallback>
            </Avatar>
        </div>
    )
};

export const StackedAvatars: Story = {
    render: () => (
        <div className="flex -space-x-2">
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://avatars.githubusercontent.com/u/2178663?s=200&v=4" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://avatars.githubusercontent.com/u/124599?s=200&v=4" />
                <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>+5</AvatarFallback>
            </Avatar>
        </div>
    )
};
