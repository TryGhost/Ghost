import type {Meta, StoryObj} from '@storybook/react-vite';
import {Upload} from 'lucide-react';
import {Dropzone} from '@/components/ui/dropzone';

const meta = {
    title: 'Components / Dropzone',
    component: Dropzone,
    tags: ['autodocs'],
    args: {
        children: (
            <div className="pointer-events-none flex flex-col items-center">
                <Upload className="mb-2 size-6 text-muted-foreground" />
                <span className="text-sm text-secondary-foreground">Select or drop a CSV file</span>
            </div>
        )
    },
    parameters: {
        docs: {
            description: {
                component: 'Accessible drag-and-drop file input wrapper built on react-dropzone.'
            }
        }
    }
} satisfies Meta<typeof Dropzone>;

export default meta;
type Story = StoryObj<typeof Dropzone>;

export const Idle: Story = {
    parameters: {
        docs: {
            description: {
                story: 'The default idle state for a file dropzone.'
            }
        }
    }
};

export const Button: Story = {
    args: {
        children: 'Upload file',
        variant: 'button'
    },
    parameters: {
        docs: {
            description: {
                story: 'A compact file picker for places where a full drop panel is unnecessary.'
            }
        }
    }
};

export const SecondaryButton: Story = {
    args: {
        children: 'Upload file',
        variant: 'buttonSecondary'
    },
    parameters: {
        docs: {
            description: {
                story: 'A compact filled file picker that pairs with secondary actions.'
            }
        }
    }
};

export const DragActive: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Drag files over the dropzone in the preview to view active styles.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        disabled: true
    },
    parameters: {
        docs: {
            description: {
                story: 'Disabled dropzones cannot receive focus or open the file picker.'
            }
        }
    }
};

export const Rejection: Story = {
    args: {
        accept: {'text/csv': ['.csv']}
    },
    parameters: {
        docs: {
            description: {
                story: 'Drop a non-CSV file in the preview to view rejection styles.'
            }
        }
    }
};

export const CustomContent: Story = {
    render: args => (
        <Dropzone {...args}>
            {({isDragActive, isDragReject}) => (
                <div className="pointer-events-none flex flex-col items-center">
                    <Upload className="mb-2 size-6 text-muted-foreground" />
                    <span className="text-sm text-secondary-foreground">
                        {isDragReject
                            ? 'This file type is not supported'
                            : isDragActive
                                ? 'Drop file to upload'
                                : 'Select or drop a CSV file'}
                    </span>
                </div>
            )}
        </Dropzone>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Render-prop children can respond to drag state with tailored guidance.'
            }
        }
    }
};
