import EmailIndicatorIcon from '../../../assets/icons/kg-indicator-email.svg?react';
import React from 'react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor.js';
import {BASIC_NODES} from '../../../index.js';
import {CardWrapper} from './../CardWrapper';
import {CtaCard} from './CtaCard';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const layoutOptions = {
    Minimal: 'minimal',
    Immersive: 'immersive'
};

const story = {
    title: 'Primary cards/CTA card',
    component: CtaCard,
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
            },
            layout: {
                options: Object.keys(layoutOptions),
                mapping: layoutOptions,
                control: {
                    type: 'radio',
                    labels: {
                        Minimal: 'Minimal',
                        Immersive: 'Immersive'
                    }
                }
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
    populateEditor({editor: htmlEditor, initialHtml: `${value}`});
    return (
        <div>
            <div className="kg-prose">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                        <CtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
            <div className="kg-prose dark bg-black px-4 py-8">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                        <CtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    value: '',
    showButton: false,
    hasBackground: false,
    hasImage: false,
    hasSponsorLabel: false,
    layout: 'immersive',
    buttonText: '',
    buttonUrl: '',
    suggestedUrls: []
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    value: 'Want to get access to premium content?',
    showButton: true,
    hasImage: true,
    hasSponsorLabel: true,
    hasBackground: false,
    layout: 'immersive',
    buttonText: 'Upgrade',
    buttonUrl: 'https://ghost.org/',
    suggestedUrls: [{label: 'Homepage', value: 'https://localhost.org/'}]
};

