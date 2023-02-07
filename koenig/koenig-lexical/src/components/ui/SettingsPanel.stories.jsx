import React from 'react';

import {SettingsPanel, ToggleSetting, InputSetting, SettingsDivider, ButtonGroupSetting, ThumbnailSetting} from './SettingsPanel';
import {ReactComponent as ImageRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImageFullIcon} from '../../assets/icons/kg-img-full.svg';

const story = {
    title: 'Settings panel/Settings panel',
    component: SettingsPanel,
    subcomponents: {ToggleSetting, InputSetting, SettingsDivider, ButtonGroupSetting},
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = (args) => {
    return (
        <div className="relative">
            <SettingsPanel {...args} />
        </div>
    );
};

export const EmailCtaCard = Template.bind({});
EmailCtaCard.args = {
    children: [
        <ToggleSetting label='Separators' />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />
    ]
};

export const ButtonCard = Template.bind({});
ButtonCard.args = {
    children: [
        <SettingsDivider />,
        <InputSetting label='Button text' />,
        <InputSetting label='Button URL' />
    ]
};

export const CalloutCard = Template.bind({});
CalloutCard.args = {
    children: [
        <ToggleSetting label='Emoji' />
    ]
};

const buttonGroupChildren = [
    {
        label: 'Regular',
        name: 'regular',
        Icon: ImageRegularIcon
    },
    {
        label: 'Wide',
        name: 'wide',
        Icon: ImageWideIcon
    },
    {
        label: 'Full',
        name: 'full',
        Icon: ImageFullIcon
    }
];

export const VideoCard = Template.bind({});
VideoCard.args = {
    children: [
        <ButtonGroupSetting
            label='Video width' buttons={buttonGroupChildren} />,
        <ToggleSetting
            label='Loop'
            description='Autoplay your video on a loop without sound.'
        />,
        <ThumbnailSetting
            label='Custom thumbnail'
            icon='file'
            desc=''
            size='xsmall'
        />
    ]
};

export const ProductCard = Template.bind({});
ProductCard.args = {
    children: [
        <ToggleSetting label='Rating' />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />
    ]
};

export const HeaderCard = Template.bind({});
HeaderCard.args = {
    children: [
        <SettingsDivider />,
        <ToggleSetting label='Button' />
    ]
};
