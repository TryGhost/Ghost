import type {Meta, StoryObj} from '@storybook/react-vite';

import Button from '../button';
import ButtonGroup from '../button-group';
import DesktopChromeHeader from './desktop-chrome-header';

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

export const CustomToolbar: Story = {
    args: {
        toolbarLeft: <Button icon='arrow-left' link={true} size='sm' />,
        toolbarCenter: <span>Homepage</span>,
        toolbarRight: <ButtonGroup
            buttons={[
                {icon: 'laptop', link: true, size: 'sm'},
                {icon: 'mobile', link: true, size: 'sm', iconColorClass: 'text-grey-500'}
            ]}
        />
    }
};
