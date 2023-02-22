import React from 'react';

import {SettingsPanel, ToggleSetting, InputSetting, DropdownSetting, ColorPickerSetting, SettingsDivider, ButtonGroupSetting, ThumbnailSetting} from './SettingsPanel';
import {ReactComponent as ImageRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImageFullIcon} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as LeftAlignIcon} from '../../assets/icons/kg-align-left.svg';
import {ReactComponent as CenterAlignIcon} from '../../assets/icons/kg-align-center.svg';

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

const alignmentButtonGroup = [
    {
        label: 'Left',
        name: 'left',
        Icon: LeftAlignIcon
    },
    {
        label: 'Center',
        name: 'center',
        Icon: CenterAlignIcon
    }
];

const widthButtonGroup = [
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

const sizeButtonGroup = [
    {
        label: 'S',
        name: 'S'
    },
    {
        label: 'M',
        name: 'M'
    },
    {
        label: 'L',
        name: 'L'
    }
];

export const EmailCtaCard = Template.bind({});
EmailCtaCard.args = {
    children: [
        <DropdownSetting
            label='Visibility'
            description='Visible for this audience when delivered by email. This card is not published on your site.'
            trigger='Free members'
            menu={['Free members', 'Paid members']}
        />,
        <SettingsDivider />,
        <ButtonGroupSetting label='Content alignment' buttons={alignmentButtonGroup} />,
        <ToggleSetting label='Separators' />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

export const ButtonCard = Template.bind({});
ButtonCard.args = {
    children: [
        <ButtonGroupSetting label='Content alignment' buttons={alignmentButtonGroup} />,
        <SettingsDivider />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

const calloutColorPicker = [
    {
        label: 'Grey',
        color: 'grey-100'
    },
    {
        label: 'White',
        color: 'white'
    },
    {
        label: 'Blue',
        color: 'blue-100'
    },
    {
        label: 'Green',
        color: 'green-100'
    },
    {
        label: 'Yellow',
        color: 'yellow-100'
    },
    {
        label: 'Red',
        color: 'red-100'
    },
    {
        label: 'Pink',
        color: 'pink-100'
    },
    {
        label: 'Purple',
        color: 'purple-100'
    },
    {
        label: 'Accent',
        color: 'pink'
    }
];

export const CalloutCard = Template.bind({});
CalloutCard.args = {
    children: [
        <ColorPickerSetting label='Background color' buttons={calloutColorPicker} layout='stacked' />,
        <ToggleSetting label='Emoji' />
    ]
};

export const VideoCard = Template.bind({});
VideoCard.args = {
    children: [
        <ButtonGroupSetting
            label='Video width' 
            buttons={widthButtonGroup} 
        />,
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
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

const headerColorPicker = [
    {
        label: 'Dark',
        color: 'black'
    },
    {
        label: 'Light',
        color: 'grey-50'
    },
    {
        label: 'Accent',
        color: 'pink'
    }
];

export const HeaderCard = Template.bind({});
HeaderCard.args = {
    children: [
        <ButtonGroupSetting label='Size' buttons={sizeButtonGroup} />,
        <ColorPickerSetting label='Style' buttons={headerColorPicker} />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};
