import {Input} from './Input';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Input> = {
    title: 'Generic/Input',
    component: Input,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<typeof Input> = args => (
    <div className="w-[240px]">
        <Input {...args} />
    </div>
);

export const Default: StoryFn<typeof Input> = Template.bind({});
