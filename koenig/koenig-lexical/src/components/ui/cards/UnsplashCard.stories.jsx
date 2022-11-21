import React from 'react';
import {UnsplashCard} from './Unsplashcard';

const story = {
    title: 'Embed cards/Unsplash card',
    component: UnsplashCard
};
export default story;

const Template = args => (
    <div className="w-full">
        <UnsplashCard {...args} />
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true
};