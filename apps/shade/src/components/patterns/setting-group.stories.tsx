import type {Meta, StoryObj} from '@storybook/react-vite';

import {Button} from '@/components/ui/button';
import {
    SettingGroup,
    SettingGroupActions,
    SettingGroupContent,
    SettingGroupDescription,
    SettingGroupDetails,
    SettingGroupHeader,
    SettingGroupTitle,
    SettingGroupValue,
    SettingGroupValueContent,
    SettingGroupValueTitle
} from '@/components/patterns/setting-group';

const meta = {
    title: 'Patterns / Setting Group',
    component: SettingGroup,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Groups related Ghost settings into a consistent card with composable header, actions, content, and value regions.'
            }
        }
    }
} satisfies Meta<typeof SettingGroup>;

export default meta;
type Story = StoryObj<typeof SettingGroup>;

const Values = () => (
    <SettingGroupContent columns={2}>
        <SettingGroupValue>
            <SettingGroupValueTitle>Publication name</SettingGroupValueTitle>
            <SettingGroupValueContent className='mt-1'>The Daily Chronicle</SettingGroupValueContent>
        </SettingGroupValue>
        <SettingGroupValue>
            <SettingGroupValueTitle>Description</SettingGroupValueTitle>
            <SettingGroupValueContent className='mt-1'>Independent news and analysis</SettingGroupValueContent>
        </SettingGroupValue>
    </SettingGroupContent>
);

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use the default outlined group for a top-level settings card.'
            }
        }
    },
    render: () => (
        <SettingGroup className='max-w-3xl'>
            <SettingGroupHeader>
                <SettingGroupDetails>
                    <SettingGroupTitle>Title & description</SettingGroupTitle>
                    <SettingGroupDescription>The details used to identify your publication around the web</SettingGroupDescription>
                </SettingGroupDetails>
                <SettingGroupActions>
                    <Button size='sm' variant='ghost'>Edit</Button>
                </SettingGroupActions>
            </SettingGroupHeader>
            <Values />
        </SettingGroup>
    )
};

export const Editing: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Set editing when the consumer is displaying editable fields and save controls.'
            }
        }
    },
    render: () => (
        <SettingGroup className='max-w-3xl' editing>
            <SettingGroupHeader>
                <SettingGroupDetails>
                    <SettingGroupTitle>Title & description</SettingGroupTitle>
                    <SettingGroupDescription>The details used to identify your publication around the web</SettingGroupDescription>
                </SettingGroupDetails>
                <SettingGroupActions className='flex gap-2'>
                    <Button size='sm' variant='ghost'>Cancel</Button>
                    <Button size='sm' disabled>Save</Button>
                </SettingGroupActions>
            </SettingGroupHeader>
            <SettingGroupContent>
                <div className='h-9 rounded-md bg-muted' />
                <div className='h-9 rounded-md bg-muted' />
            </SettingGroupContent>
        </SettingGroup>
    )
};

export const Highlighted: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use highlighted briefly when routing or search needs to draw attention to a group.'
            }
        }
    },
    render: () => (
        <SettingGroup className='max-w-3xl' highlighted>
            <SettingGroupHeader>
                <SettingGroupDetails>
                    <SettingGroupTitle>Highlighted group</SettingGroupTitle>
                    <SettingGroupDescription>This group has temporary emphasis.</SettingGroupDescription>
                </SettingGroupDetails>
            </SettingGroupHeader>
        </SettingGroup>
    )
};

export const Plain: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use the plain variant when a parent modal already provides the surrounding surface.'
            }
        }
    },
    render: () => (
        <SettingGroup className='max-w-3xl' variant='plain'>
            <Values />
        </SettingGroup>
    )
};
