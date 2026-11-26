import {UrlSearchInput} from './UrlSearchInput';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof UrlSearchInput> = {
    title: 'Generic/Searchable URL Input',
    component: UrlSearchInput,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<typeof UrlSearchInput> = args => (
    <div className="w-[740px]">
        <div className="p-4">
            <UrlSearchInput {...args} />
        </div>
        <div className="dark bg-black p-4">
            <UrlSearchInput {...args} />
        </div>
    </div>
);

export const Empty: StoryFn<typeof UrlSearchInput> = Template.bind({});
Empty.args = {
    value: '',
};

export const Loading: StoryFn<typeof UrlSearchInput> = Template.bind({});
Loading.args = {
    value: 'https://ghost.org/',
    isLoading: true
};

export const Placeholder: StoryFn<typeof UrlSearchInput> = Template.bind({});
Placeholder.args = {
    value: '',
    placeholder: 'Enter a URL to add content...'
};

export const Populated: StoryFn<typeof UrlSearchInput> = Template.bind({});
Populated.args = {
    value: 'https://sampleurl.com',
};

export const Error: StoryFn<typeof UrlSearchInput> = Template.bind({});
Error.args = {
    value: 'thisisntaurl',
    hasError: true,
    handleRetry: () => {},
    handlePasteAsLink: () => {}
};
