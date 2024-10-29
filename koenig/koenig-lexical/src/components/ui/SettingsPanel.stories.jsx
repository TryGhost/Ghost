/* eslint-disable react/jsx-key */
import React from 'react';

import CenterAlignIcon from '../../assets/icons/kg-align-center.svg?react';
import ImgFullIcon from '../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../assets/icons/kg-img-regular.svg?react';
import ImgWideIcon from '../../assets/icons/kg-img-wide.svg?react';
import LeftAlignIcon from '../../assets/icons/kg-align-left.svg?react';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, DropdownSetting, InputSetting, MediaUploadSetting, MultiSelectDropdownSetting, SettingsPanel, ToggleSetting} from './SettingsPanel';

const story = {
    title: 'Settings panel/Settings panel',
    component: SettingsPanel,
    subcomponents: {ToggleSetting, InputSetting, ButtonGroupSetting},
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
        <ButtonGroupSetting buttons={alignmentButtonGroup} label='Content alignment' />,
        <ToggleSetting label='Separators' />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

export const SignupCard = Template.bind({});
SignupCard.args = {
    children: [
        <ColorPickerSetting label='Background color' swatches={[
            {title: 'Brand color', accent: true},
            {title: 'Black', hex: '#000000'},
            {title: 'Transparent', transparent: true}
        ]} value='#777777' />,
        <MultiSelectDropdownSetting
            availableItems={[{id: '1', name: 'Free members'}, {id: '2', name: 'Paid members'}]}
            description='These labels will be applied to members who sign up via this form.'
            items={['1']}
            label='Labels'
        />
    ]
};

export const ButtonCard = Template.bind({});
ButtonCard.args = {
    children: [
        <ButtonGroupSetting buttons={alignmentButtonGroup} label='Content alignment' />,
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
        <ColorOptionSetting buttons={calloutColorPicker} label='Background color' layout='stacked' />,
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
        <MediaUploadSetting
            borderStyle='rounded'
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
        <ColorOptionSetting buttons={headerColorPicker} label='Style' />,
        <ToggleSetting label='Button' />,
        <InputSetting label='Button text' placeholder='Add button text' />,
        <InputSetting label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};
