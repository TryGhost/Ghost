import type {Meta, StoryObj} from '@storybook/react';

import Button from '../Button';
import ButtonGroup from '../ButtonGroup';
import DesktopChromeHeader from './DesktopChromeHeader';
import URLSelect from '../form/URLSelect';
import {SelectOption} from '../form/Select';

const meta = {
    title: 'Global / Chrome / Desktop Header',
    component: DesktopChromeHeader,
    tags: ['autodocs']
} satisfies Meta<typeof DesktopChromeHeader>;

export default meta;
type Story = StoryObj<typeof DesktopChromeHeader>;

export const Default: Story = {
    args: {}
};

export const Small: Story = {
    args: {
        size: 'sm'
    }
};

export const Large: Story = {
    args: {
        size: 'lg'
    }
};

export const Empty: Story = {
    args: {
        toolbarLeft: <></>
    }
};

export const WithTitle: Story = {
    args: {
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