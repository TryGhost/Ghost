import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from '../global/ButtonGroup';
import SettingGroupHeader from './SettingGroupHeader';

import Heading from '../global/Heading';

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
        children: <ButtonGroup 
            buttons={[{label: 'Edit', color: 'green'}]} 
            link={true} 
        />
    }
};

export const Editing: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <ButtonGroup 
            buttons={
                [
                    {label: 'Cancel'},
                    {label: 'Save', color: 'green'}
                ]
            } 
            link={true} 
        />
    }
};

export const CustomHeader: Story = {
    args: {
        children: 
            <>
                <div className='flex flex-col'>
                    <Heading level={5}>Users</Heading>
                    <span className='mt-4 text-sm'>Cristofer Vaccaro — <strong>Owner</strong></span>
                    <span className='text-xs text-grey-500'>cristofer@example.com</span>
                </div>
                <ButtonGroup 
                    buttons={[{label: 'Invite users', color: 'green'}]} 
                    link={true} 
                />
            </>
    }
};