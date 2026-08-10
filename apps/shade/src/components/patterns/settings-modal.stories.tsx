import NiceModal from '@ebay/nice-modal-react';
import type {Meta, StoryObj} from '@storybook/react-vite';

import {Button} from '@/components/ui/button';
import {Box} from '@/components/primitives/box';
import {SettingsModal, type SettingsModalProps} from '@/components/patterns/settings-modal';

const SettingsModalStory = (props: SettingsModalProps) => {
    const StoryModal = NiceModal.create<SettingsModalProps>(() => <SettingsModal {...props} />);

    return (
        <Box className='min-h-72 bg-background p-8'>
            <Button onClick={() => NiceModal.show(StoryModal)}>Open modal</Button>
        </Box>
    );
};

const meta = {
    title: 'Patterns / Settings Modal',
    component: SettingsModalStory,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Transitional compatibility shell for the existing settings NiceModal flows. New modal flows should use Shade Dialog primitives directly.'
            }
        }
    },
    decorators: [Story => (
        <NiceModal.Provider>
            <Story />
        </NiceModal.Provider>
    )]
} satisfies Meta<typeof SettingsModalStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Modal dialog',
        children: <Box className='py-4'>Modal content</Box>,
        onOk: () => undefined
    },
    parameters: {
        docs: {
            description: {
                story: 'Default modal for a focused settings task with confirm and cancel actions.'
            }
        }
    }
};

export const Small: Story = {
    args: {
        title: 'Small modal',
        size: 'sm',
        children: <Box className='py-4'>Compact modal content</Box>,
        onOk: () => undefined
    },
    parameters: {
        docs: {
            description: {
                story: 'Small modal for concise forms and lightweight actions.'
            }
        }
    }
};

export const Full: Story = {
    args: {
        title: 'Full modal',
        size: 'full',
        children: <Box className='py-4'>Full-height modal content</Box>,
        onOk: () => undefined
    },
    parameters: {
        docs: {
            description: {
                story: 'Full-height modal for complex settings editors.'
            }
        }
    }
};

export const RightDrawer: Story = {
    args: {
        'aria-label': 'Drawer settings',
        size: 'bleed',
        align: 'right',
        width: 600,
        animate: false,
        footer: false,
        children: <Box className='py-4'>Right-aligned drawer content</Box>
    },
    parameters: {
        docs: {
            description: {
                story: 'Bleed variant aligned to the right for drawer-style editors.'
            }
        }
    }
};

export const Dirty: Story = {
    args: {
        title: 'Unsaved settings',
        dirty: true,
        children: <Box className='py-4'>Close or cancel to see the dirty-state confirmation.</Box>,
        onOk: () => undefined
    }
};

export const StickyChrome: Story = {
    args: {
        title: 'Scrollable settings',
        height: 420,
        stickyHeader: true,
        stickyFooter: true,
        children: <Box className='h-[720px] py-4'>Scroll to verify the header and footer remain visible.</Box>,
        onOk: () => undefined
    }
};

export const FormSheet: Story = {
    args: {
        title: 'Form sheet',
        formSheet: true,
        children: <Box className='py-4'>Form-sheet backdrop and elevation.</Box>,
        onOk: () => undefined
    }
};

export const CustomActions: Story = {
    args: {
        title: 'Custom actions',
        leftButton: <Button variant='destructive'>Archive</Button>,
        okLabel: 'Save',
        okLoading: true,
        cancelLabel: 'Close',
        children: <Box className='py-4'>Loading, disabled, and destructive action states.</Box>,
        onOk: () => undefined
    }
};

export const BackgroundInteraction: Story = {
    args: {
        'aria-label': 'Interactive settings drawer',
        size: 'bleed',
        align: 'right',
        width: 600,
        allowBackgroundInteraction: true,
        backDrop: false,
        backDropClick: false,
        footer: false,
        children: <Box className='py-4'>The page behind this drawer remains interactive.</Box>
    }
};
