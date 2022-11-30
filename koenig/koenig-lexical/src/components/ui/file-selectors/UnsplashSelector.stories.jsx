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

export const Gallery = Template.bind({});
Gallery.args = {
    zoomedUrl: null
};

export const Zoomed = Template.bind({});
Zoomed.args = {
    zoomedUrl: 'https://images.unsplash.com/photo-1526676537331-7747bf8278fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8c2VhcmNofDEyfHxhdGhsZXRpY3MlMjB0cmFja3xlbnwwfHx8fDE2NjkxMDU1MTA&ixlib=rb-4.0.3&q=80&w=1200'
};