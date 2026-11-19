import CenterAlignIcon from '../../assets/icons/kg-align-center.svg?react';
import ImgFullIcon from '../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../assets/icons/kg-img-regular.svg?react';
import ImgWideIcon from '../../assets/icons/kg-img-wide.svg?react';
import LeftAlignIcon from '../../assets/icons/kg-align-left.svg?react';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, DropdownSetting, InputSetting, MediaUploadSetting, MultiSelectDropdownSetting, SettingsPanel, ToggleSetting} from './SettingsPanel';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof SettingsPanel> = {
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

const Template: StoryFn<typeof SettingsPanel> = (args) => {
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

export const EmailCtaCard: StoryFn<typeof SettingsPanel> = Template.bind({});
EmailCtaCard.args = {
    children: [
        <DropdownSetting
            key='visibility'
            description='Visible for this audience when delivered by email. This card is not published on your site.'
            label='Visibility'
            menu={[{label: 'Free members', name: 'status:free'}, {label: 'Paid members', name: 'status:-free'}]}
            value='status:free'
            onChange={() => {}}
        />,
        <ButtonGroupSetting key='alignment' buttons={alignmentButtonGroup} label='Content alignment' selectedName='left' onClick={() => {}} />,
        <ToggleSetting key='separators' label='Separators' />,
        <ToggleSetting key='button' label='Button' />,
        <InputSetting key='button-text' label='Button text' placeholder='Add button text' />,
        <InputSetting key='button-url' label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

export const SignupCard: StoryFn<typeof SettingsPanel> = Template.bind({});
SignupCard.args = {
    children: [
        <ColorPickerSetting key='background-color' label='Background color' swatches={[
            {title: 'Brand color', accent: true},
            {title: 'Black', hex: '#000000'},
            {title: 'Transparent', transparent: true}
        ]} value='#777777' onPickerChange={() => {}} onSwatchChange={() => {}} onTogglePicker={() => {}} />,
        <MultiSelectDropdownSetting
            key='labels'
            availableItems={['Free members', 'Paid members']}
            description='These labels will be applied to members who sign up via this form.'
            items={['Free members']}
            label='Labels'
            onChange={() => {}}
        />
    ]
};

export const ButtonCard: StoryFn<typeof SettingsPanel> = Template.bind({});
ButtonCard.args = {
    children: [
        <ButtonGroupSetting key='alignment' buttons={alignmentButtonGroup} label='Content alignment' selectedName='left' onClick={() => {}} />,
        <InputSetting key='button-text' label='Button text' placeholder='Add button text' />,
        <InputSetting key='button-url' label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
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

export const CalloutCard: StoryFn<typeof SettingsPanel> = Template.bind({});
CalloutCard.args = {
    children: [
        <ColorOptionSetting key='background-color' buttons={calloutColorPicker} label='Background color' layout='stacked' onClick={() => {}} />,
        <ToggleSetting key='emoji' label='Emoji' />
    ]
};

export const VideoCard: StoryFn<typeof SettingsPanel> = Template.bind({});
VideoCard.args = {
    children: [
        <ButtonGroupSetting
            key='video-width'
            buttons={widthButtonGroup}
            label='Video width'
            selectedName='regular'
            onClick={() => {}}
        />,
        <ToggleSetting
            key='loop'
            description='Autoplay your video on a loop without sound.'
            label='Loop'
        />,
        <MediaUploadSetting
            key='custom-thumbnail'
            borderStyle='rounded'
            desc=''
            icon='file'
            label='Custom thumbnail'
            size='xsmall'
            onFileChange={() => {}}
        />
    ]
};

export const ProductCard: StoryFn<typeof SettingsPanel> = Template.bind({});
ProductCard.args = {
    children: [
        <ToggleSetting key='rating' label='Rating' />,
        <ToggleSetting key='button' label='Button' />,
        <InputSetting key='button-text' label='Button text' placeholder='Add button text' />,
        <InputSetting key='button-url' label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};

const headerColorPicker = [
    {
        label: 'Dark',
        name: 'dark',
        color: 'black'
    },
    {
        label: 'Light',
        name: 'light',
        color: 'grey-50'
    },
    {
        label: 'Accent',
        name: 'accent',
        color: 'pink'
    }
];

export const HeaderCard: StoryFn<typeof SettingsPanel> = Template.bind({});
HeaderCard.args = {
    children: [
        <ButtonGroupSetting key='size' buttons={sizeButtonGroup} label='Size' selectedName='S' onClick={() => {}} />,
        <ColorOptionSetting key='style' buttons={headerColorPicker} label='Style' onClick={() => {}} />,
        <ToggleSetting key='button' label='Button' />,
        <InputSetting key='button-text' label='Button text' placeholder='Add button text' />,
        <InputSetting key='button-url' label='Button URL' placeholder='https://yoursite.com/#/portal/signup/' />
    ]
};
