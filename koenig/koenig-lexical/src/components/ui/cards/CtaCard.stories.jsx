import React from 'react';
import VisibilityIndicatorIcon from '../../../assets/icons/kg-indicator-visibility.svg?react';
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
                    <CardWrapper
                        IndicatorIcon={VisibilityIndicatorIcon}
                        indicatorPosition={{
                            top: '1.2rem'
                        }}
                        {...(args.color === '' && {wrapperStyle: 'wide'})}
                        {...display}
                        {...args}
                    >
                        <CtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div>
            {/* <div className="kg-prose dark bg-black px-4 py-8">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper
                        IndicatorIcon={VisibilityIndicatorIcon}
                        {...(args.color === 'none' && {wrapperStyle: 'wide'})}
                        {...display}
                        {...args}
                    >
                        <CtaCard {...display} {...args} htmlEditor={htmlEditor} />
                    </CardWrapper>
                </div>
            </div> */}
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    value: '',
    showButton: false,
    hasSponsorLabel: false,
    imageSrc: '',
    color: 'blue',
    buttonColor: '#2e398a',
    layout: 'immersive',
    buttonText: '',
    buttonUrl: '',
    suggestedUrls: []
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    value: 'Introducing the Air Stride 90X – where bold design meets unmatched performance. Engineered for ultimate support and breathability, it’s the perfect companion for your active lifestyle. Step up your game, in style.',
    showButton: true,
    hasSponsorLabel: true,
    imageSrc: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=4431&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    color: 'blue',
    buttonColor: '#2e398a',
    layout: 'immersive',
    buttonText: 'Grab 20% discount',
    buttonUrl: 'https://ghost.org/',
    suggestedUrls: [{label: 'Homepage', value: 'https://localhost.org/'}]
};

