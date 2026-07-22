import type {Meta, StoryObj} from '@storybook/react-vite';

import SettingGroupHeader from './setting-group-header';
import {Text} from '@tryghost/shade/primitives';

const meta = {
    title: 'Settings / Setting Group / Header',
    component: SettingGroupHeader,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <span>Edit action slot</span>
    }
};

export const Editing: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <span>Cancel and save action slots</span>
    }
};

export const CustomHeader: Story = {
    args: {
        children:
            <>
                <div className='flex flex-col'>
                    <Text as='h5' className='md:text-lg' leading='supertight' weight='bold'>Users</Text>
                    <span className='mt-4 text-sm'>Cristofer Vaccaro — <strong>Owner</strong></span>
                    <span className='text-sm text-grey-500'>cristofer@example.com</span>
                </div>
                <span>Invite users action slot</span>
            </>
    }
};
