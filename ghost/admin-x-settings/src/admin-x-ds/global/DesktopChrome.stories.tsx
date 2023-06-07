import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
import ButtonGroup from './ButtonGroup';
import DesktopChrome from './DesktopChrome';
import URLSelect from './URLSelect';
import {SelectOption} from './Select';

const meta = {
    title: 'Global / Chrome / Desktop',
    component: DesktopChrome,
    tags: ['autodocs']
} satisfies Meta<typeof DesktopChrome>;

export default meta;
type Story = StoryObj<typeof DesktopChrome>;

export const Default: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        )
    }
};

export const Small: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        size: 'sm'
    }
};

export const WithBorder: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        border: true
    }
};

export const Empty: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        toolbarLeft: <></>
    }
};

export const WithTitle: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        toolbarCenter: 'Hello title'
    }
};

const selectOptions: SelectOption[] = [
    {value: 'homepage', label: 'Homepage'},
    {value: 'post', label: 'Post'},
    {value: 'page', label: 'Page'},
    {value: 'tag-archive', label: 'Tag archive'},
    {value: 'author-archive', label: 'Author archive'}
];

export const CustomToolbar: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        toolbarLeft: <Button icon='arrow-left' link={true} size='sm' />,
        toolbarCenter: <URLSelect options={selectOptions} onSelect={(value: string) => {
            alert(value);
        }} />,
        toolbarRight: <ButtonGroup
            buttons={[
                {icon: 'laptop', link: true, size: 'sm'},
                {icon: 'mobile', link: true, size: 'sm', iconColorClass: 'text-grey-500'}
            ]}
        />
    }
};