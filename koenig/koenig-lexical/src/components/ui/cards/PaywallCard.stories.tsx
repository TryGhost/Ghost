import KoenigComposerContext, {defaultKoenigComposerContext} from '../../../context/KoenigComposerContext';
import {CardWrapper} from './../CardWrapper';
import {PaywallCard} from './PaywallCard';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';
import type {PostVisibility} from '../../../context/KoenigComposerContext';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const accessOptions: PostVisibility[] = ['public', 'members', 'paid', 'tiers'];

type StoryArgs = ComponentProps<typeof PaywallCard> & {access: PostVisibility; display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Public preview card',
    component: PaywallCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected'
                },
                defaultValue: displayOptions.Default
            }
        },
        access: {
            options: accessOptions,
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({access, display, ...args}) => {
    const cardConfig = {
        feature: {
            paywallImprovements: true
        },
        post: {
            visibility: access
        }
    };

    return (
        <KoenigComposerContext.Provider value={{...defaultKoenigComposerContext, cardConfig}}>
            <div className="kg-prose">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px] px-3 py-9">
                    <CardWrapper {...displayOptions[display]} {...args}>
                        <PaywallCard />
                    </CardWrapper>
                </div>
                <div className="dark mx-auto my-8 min-w-[initial] max-w-[740px] bg-black px-3 py-9">
                    <CardWrapper {...displayOptions[display]} {...args}>
                        <PaywallCard />
                    </CardWrapper>
                </div>
            </div>
        </KoenigComposerContext.Provider>
    );
};

export const Default: StoryFn<StoryArgs> = Template.bind({});
Default.args = {
    access: 'members',
    display: 'Selected'
};
