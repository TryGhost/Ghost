import {SubscribeForm} from './SubscribeForm';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof SubscribeForm> = {
    title: 'Generic/Subscribe form',
    component: SubscribeForm,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<typeof SubscribeForm> = args => (
    <div className="w-[560px]">
        <SubscribeForm {...args} />
    </div>
);

export const Default: StoryFn<typeof SubscribeForm> = Template.bind({});
