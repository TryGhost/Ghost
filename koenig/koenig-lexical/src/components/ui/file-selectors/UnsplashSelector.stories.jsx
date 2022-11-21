import React from 'react';
import {UnsplashSelector} from './UnsplashSelector';

const story = {
    title: 'File Selectors/Unsplash',
    component: UnsplashSelector
};
export default story;

const Template = args => (
    <div className="w-full">
        <UnsplashSelector {...args} />
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true
};
