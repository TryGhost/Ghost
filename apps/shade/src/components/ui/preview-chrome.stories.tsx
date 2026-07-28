import type {Meta, StoryObj} from '@storybook/react-vite';
import {Box, Text} from '@/components/primitives';
import {PreviewChrome} from '@/components/ui/preview-chrome';

const meta = {
    title: 'Components / Preview Chrome',
    component: PreviewChrome,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Frames preview content at desktop or mobile device dimensions.'
            }
        }
    }
} satisfies Meta<typeof PreviewChrome>;

export default meta;
type Story = StoryObj<typeof PreviewChrome>;

const previewContent = (
    <Box className='size-full bg-background' padding='xl'>
        <Text weight='semibold'>Preview content</Text>
    </Box>
);

export const Desktop: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use the desktop frame for wide publication and theme previews.'
            }
        }
    },
    render: () => (
        <Box className='h-[480px] w-[960px] bg-muted'>
            <PreviewChrome device='desktop'>
                {previewContent}
            </PreviewChrome>
        </Box>
    )
};

export const Mobile: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use the mobile frame for narrow, independently scrolling previews.'
            }
        }
    },
    render: () => (
        <Box className='bg-muted' padding='2xl'>
            <PreviewChrome device='mobile'>
                {previewContent}
            </PreviewChrome>
        </Box>
    )
};
