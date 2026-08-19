import KoenigComposerContext, {defaultKoenigComposerContext} from '../../../context/KoenigComposerContext';
import {CardWrapper} from './../CardWrapper';
import {PaywallV2Card} from './PaywallV2Card';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Paywall card',
    component: PaywallV2Card,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                defaultValue: displayOptions.Default
            }
        },
        access: {
            options: ['members', 'paid', 'tiers'],
            control: {type: 'radio'}
        },
        activeTarget: {
            options: ['web', 'email'],
            control: {type: 'radio'}
        },
        layout: {
            options: ['minimal', 'immersive'],
            control: {type: 'radio'}
        },
        alignment: {
            options: ['left', 'center'],
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = ({display, ...args}) => {
    const cardConfig = {
        feature: {
            paywallV2: true
        },
        post: {
            visibility: 'paid'
        }
    };

    return (
        <KoenigComposerContext.Provider value={{...defaultKoenigComposerContext, cardConfig}}>
            <div className="kg-prose">
                <div className="mx-auto my-8 min-w-[initial] max-w-[740px] px-3 py-9">
                    <CardWrapper {...display} {...args}>
                        <PaywallV2Card {...display} {...args} />
                    </CardWrapper>
                </div>
                <div className="dark mx-auto my-8 min-w-[initial] max-w-[740px] bg-black px-3 py-9">
                    <CardWrapper {...display} {...args}>
                        <PaywallV2Card {...display} {...args} />
                    </CardWrapper>
                </div>
            </div>
        </KoenigComposerContext.Provider>
    );
};

export const Web = Template.bind({});
Web.args = {
    display: 'Selected',
    access: 'paid',
    activeTarget: 'web',
    alignment: 'center',
    buttonText: 'Upgrade',
    buttonUrl: 'https://ghost.org/#/portal/signup',
    color: 'grey',
    layout: 'immersive',
    showButton: true
};

export const Email = Template.bind({});
Email.args = {
    ...Web.args,
    activeTarget: 'email'
};

// The target switch only renders in the edit state now, so without a story in
// that state it doesn't appear in Storybook at all.
export const Editing = Template.bind({});
Editing.args = {
    ...Web.args,
    display: 'Editing'
};
