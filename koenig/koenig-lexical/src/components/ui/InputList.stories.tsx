import {InputList} from './InputList';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof InputList> = {
    title: 'Generic/InputList',
    component: InputList,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

// One at the top, one at the bottom using flexbox
const Template: StoryFn<typeof InputList> = args => (
    <div className="flex h-screen w-[240px] flex-col justify-between">
        <InputList {...args} />

        <div className="mt-auto">
            <InputList {...args} />
        </div>
    </div>
);

export const Default: StoryFn<typeof InputList> = Template.bind({});
Default.args = {
    listOptions: [
        {value: 'https://google.com', label: 'Google'},
        {value: 'https://facebook.com', label: 'Facebook'},
        {value: 'https://twitter.com', label: 'Twitter'},
        {value: 'https://instagram.com', label: 'Instagram'},
        {value: 'https://youtube.com', label: 'Youtube'},
        {value: 'https://linkedin.com', label: 'Linkedin'},
        {value: 'https://pinterest.com', label: 'Pinterest'},
        {value: 'https://tiktok.com', label: 'TikTok'},
        {value: 'https://twitch.com', label: 'Twitch'},
        {value: 'https://reddit.com', label: 'Reddit'},
        {value: 'https://github.com', label: 'Github'},
        {value: 'https://stackoverflow.com', label: 'Stackoverflow'}
    ],
    placeholder: 'Enter a URL'
};
