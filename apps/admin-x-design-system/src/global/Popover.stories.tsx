import type {Meta, StoryObj} from '@storybook/react';

// import BoilerPlate from './Boilerplate';
import Button from './Button';
import Popover from './Popover';

const meta = {
    title: 'Global / Popover',
    component: Popover,
    tags: ['autodocs'],
    argTypes: {
        trigger: {
            control: {
                type: 'text'
            }
        }
    }
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
    args: {
        trigger: (
            <Button color='grey' label='Open popover' />
        ),
        children: (
            <div className='p-5 text-sm' style={{maxWidth: '320px'}}>
                This is a popover. You can put anything in it. The styling of the content defines how it will look at the end.
            </div>
        )
    }
};
