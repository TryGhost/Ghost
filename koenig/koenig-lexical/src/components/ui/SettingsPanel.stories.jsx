import React from 'react';

import {SettingsPanel} from './SettingsPanel';

const story = {
    title: 'Settings panel/Settings panel',
    component: SettingsPanel,
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = args => (
    <div className="relative">
        <SettingsPanel {...args} />
    </div>
);

export const VideoCard = Template.bind({});
