import {UrlInput} from './UrlInput';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof UrlInput> = {
    title: 'Generic/URL Input',
    component: UrlInput,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<typeof UrlInput> = args => (
    <div className="w-[740px]">
        <div className="p-4">
            <UrlInput {...args} />
        </div>
        <div className="dark bg-black p-4">
            <UrlInput {...args} />
        </div>
    </div>
);

export const Empty: StoryFn<typeof UrlInput> = Template.bind({});
Empty.args = {
    value: '',
};

export const Loading: StoryFn<typeof UrlInput> = Template.bind({});
Loading.args = {
    value: 'https://ghost.org/',
    isLoading: true
};

export const Placeholder: StoryFn<typeof UrlInput> = Template.bind({});
Placeholder.args = {
    value: '',
    placeholder: 'Enter a URL to add content...'
};

export const Populated: StoryFn<typeof UrlInput> = Template.bind({});
Populated.args = {
    value: 'https://sampleurl.com',
};

export const Error: StoryFn<typeof UrlInput> = Template.bind({});
Error.args = {
    value: 'thisisntaurl',
    hasError: true,
    handleRetry: () => {},
    handlePasteAsLink: () => {}
};