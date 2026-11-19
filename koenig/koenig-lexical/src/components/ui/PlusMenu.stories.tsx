import {PlusButton} from './PlusMenu';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof PlusButton> = {
    title: 'Card menu/Plus button',
    component: PlusButton,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof PlusButton> = args => (
    <div className="relative ml-[66px] mt-[2px]">
        <PlusButton {...args} />
    </div>
);

export const Default: StoryFn<typeof PlusButton> = Template.bind({});
