/* eslint-disable react/jsx-key */
import React from 'react';

import {ButtonGroupSetting, ColorPickerSetting, DropdownSetting, InputSetting, MultiSelectDropdownSetting, SettingsDivider, SettingsPanel, ThumbnailSetting, ToggleSetting} from './SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../assets/icons/kg-align-center.svg';
import {ReactComponent as ImgFullIcon} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as LeftAlignIcon} from '../../assets/icons/kg-align-left.svg';

const story = {
    title: 'Settings panel/Settings panel',
    component: SettingsPanel,
    subcomponents: {ToggleSetting, InputSetting, SettingsDivider, ButtonGroupSetting},
    parameters: {
        status: {
            type: 'uiReady'
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
        Icon: ImgRegularIcon
    },
    {
        label: 'Wide',
        name: 'wide',
        Icon: ImgWideIcon
    },
    {
        label: 'Full',
        name: 'full',
        Icon: ImgFullIcon
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
            description='Visible for this audience when delivered by email. This card is not published on your site.'
            label='Visibility'
            menu={[{label: 'Free members', name: 'status:free'}, {label: 'Paid members', name: 'status:-free'}]}
            value='status:free'
        />,
        <SettingsDivider />,
        <ButtonGroupSetting buttons={alignmentButtonGroup} label='Content alignment' />,
        <ToggleSetting label='Separators' />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

export const SignupLabelsCard = Template.bind({});
SignupLabelsCard.args = {
    children: [
        <MultiSelectDropdownSetting
            description='These labels will be applied to members who sign up via this form.'
            label='Labels'
            menu={[{id: '1', name: 'Free members'}, {id: '2', name: 'Paid members'}]}
            value={['1']}
        />
    ]
};

export const ButtonCard = Template.bind({});
ButtonCard.args = {
    children: [
        <ButtonGroupSetting buttons={alignmentButtonGroup} label='Content alignment' />,
        <SettingsDivider />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

const calloutColorPicker = [
    {
        label: 'Grey',
        name: 'grey',
        colorClass: 'bg-grey-100'
    },
    {
        label: 'White',
        name: 'white',
        colorClass: 'bg-white'
    },
    {
        label: 'Blue',
        name: 'blue',
        colorClass: 'bg-blue-100'
    },
    {
        label: 'Green',
        name: 'green',
        colorClass: 'bg-green-100'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        colorClass: 'bg-yellow-100'
    },
    {
        label: 'Red',
        name: 'red',
        colorClass: 'bg-red-100'
    },
    {
        label: 'Pink',
        name: 'pink',
        colorClass: 'bg-pink-100'
    },
    {
        label: 'Purple',
        name: 'purple',
        colorClass: 'bg-purple-100'
    },
    {
        label: 'Accent',
        name: 'accent',
        colorClass: 'bg-pink'
    }
];

export const CalloutCard = Template.bind({});
CalloutCard.args = {
    children: [
        <ColorPickerSetting buttons={calloutColorPicker} label='Background color' layout='stacked' />,
        <ToggleSetting label='Emoji' />
    ]
};

export const VideoCard = Template.bind({});
VideoCard.args = {
    children: [
        <ButtonGroupSetting
            buttons={widthButtonGroup}
            label='Video width'
        />,
        <ToggleSetting
            description='Autoplay your video on a loop without sound.'
            label='Loop'
        />,
        <ThumbnailSetting
            desc=''
            icon='file'
            label='Custom thumbnail'
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
        <ButtonGroupSetting buttons={sizeButtonGroup} label='Size' />,
        <ColorPickerSetting buttons={headerColorPicker} label='Style' />,
        <SettingsDivider />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};
