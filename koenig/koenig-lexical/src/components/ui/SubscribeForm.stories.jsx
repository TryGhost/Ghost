import React from 'react';

import {SubscribeForm} from './SubscribeForm';

const story = {
    title: 'Generic/Subscribe form',
    component: SubscribeForm,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[560px]">
        <SubscribeForm {...args} />
    </div>
);

export const Default = Template.bind({});
