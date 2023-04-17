import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor.js';
import {BASIC_NODES} from '../../../index.js';
import {CardWrapper} from './../CardWrapper';
import {EmailCtaCard} from './EmailCtaCard';
import {ReactComponent as EmailIndicatorIcon} from '../../../assets/icons/kg-indicator-email.svg';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Email CTA card',
    component: EmailCtaCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
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

const Template = ({display, value, ...args}) => {
    const htmlEditor = createEditor({nodes: BASIC_NODES});
    populateNestedEditor({editor: htmlEditor, initialHtml: `<p>${value}</p>`});
    return (
        <div>
            <div className="kg-prose">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                        <EmailCtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
            <div className="kg-prose dark bg-black px-4 py-8">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                        <EmailCtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    segment: 'status:free',
    alignment: 'left',
    showDividers: true,
    value: '',
    placeholder: 'Email only text... (optional)',
    showButton: true,
    buttonText: '',
    buttonUrl: ''
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    segment: 'status:free',
    alignment: 'center',
    value: 'Want to get access to premium content?',
    placeholder: 'Email only text... (optional)',
    showButton: false,
    showDividers: true,
    buttonText: 'Upgrade',
    buttonUrl: 'https://ghost.org/'
};

