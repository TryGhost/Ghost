import type {Meta, StoryObj} from '@storybook/react-vite';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent} from './action-list';
import {Avatar} from './avatar';
import {Button} from './button';

const meta = {
    title: 'Components / Action List',
    component: ActionList,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Rows of related settings or resources with optional leading visuals and actions. Use Table for genuinely tabular data.'
            }
        }
    }
} satisfies Meta<typeof ActionList>;

export default meta;
type Story = StoryObj<typeof ActionList>;

export const Default: Story = {
    args: {
        children: (
            <>
                <ActionListItem>
                    <ActionListItemContent asChild>
                        <button className='flex items-center gap-3 py-3 text-left' type='button'>
                            <Avatar name='Jamie Wilson' />
                            <span>
                                <span className='block font-medium'>Jamie Wilson</span>
                                <span className='block text-sm text-muted-foreground'>jamie@example.com</span>
                            </span>
                        </button>
                    </ActionListItemContent>
                    <ActionListItemActions visibility='hover'>
                        <Button size='sm' variant='ghost'>Edit</Button>
                    </ActionListItemActions>
                </ActionListItem>
                <ActionListItem hover={false}>
                    <ActionListItemContent className='py-3'>
                        <span className='block font-medium'>Delete all content</span>
                        <span className='block text-sm text-muted-foreground'>Permanently delete all posts and tags.</span>
                    </ActionListItemContent>
                    <ActionListItemActions>
                        <Button size='sm' variant='destructive'>Delete</Button>
                    </ActionListItemActions>
                </ActionListItem>
            </>
        )
    }
};
