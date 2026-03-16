import EmailIndicatorIcon from '../../../assets/icons/kg-indicator-email.svg?react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {BASIC_NODES} from '../../../index';
import {CardWrapper} from './../CardWrapper';
import {EmailCtaCard} from './EmailCtaCard';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof EmailCtaCard> & {display: keyof typeof displayOptions; value?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Email CTA card',
    component: EmailCtaCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, value, ...args}) => {
    const htmlEditor = createEditor({nodes: BASIC_NODES});
    populateEditor({editor: htmlEditor, initialHtml: `${value}`});
    return (
        <div>
            <div className="kg-prose">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...displayOptions[display]} {...args}>
                        <EmailCtaCard {...displayOptions[display]} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
            <div className="kg-prose dark bg-black px-4 py-8">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...displayOptions[display]} {...args}>
                        <EmailCtaCard {...displayOptions[display]} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    segment: 'status:free',
    alignment: 'left',
    showDividers: true,
    value: '',
    showButton: true,
    buttonText: '',
    buttonUrl: ''
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    segment: 'status:free',
    alignment: 'center',
    value: 'Want to get access to premium content?',
    showButton: false,
    showDividers: true,
    buttonText: 'Upgrade',
    buttonUrl: 'https://ghost.org/'
};

