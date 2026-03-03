import {ButtonGroupRowField} from '../../fields/button-group-row-field';
import {ColorPickerRowField} from '../../fields/color-picker-row-field';
import {Form} from '@tryghost/admin-x-design-system';
import {HeaderBackgroundColorField} from '../../fields/header-background-color-field';
import {autoAccentSwatches} from '../../design/constants';
import {isBackgroundDark} from '../../design/helpers';
import type {BaseEmailDesignFormState, NewsletterDesignFormState} from '../../types';

type HeaderDesignFieldsProps<TFormState extends BaseEmailDesignFormState & NewsletterDesignFormState> = {
    formState: TFormState;
    accentColor: string;
    updateFormState: (fields: Partial<TFormState>) => void;
};

export const HeaderDesignFields = <TFormState extends BaseEmailDesignFormState & NewsletterDesignFormState>({formState, accentColor, updateFormState}: HeaderDesignFieldsProps<TFormState>) => {
    const autoHex = isBackgroundDark(formState.background_color) ? '#ffffff' : '#000000';

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Header'>
            <HeaderBackgroundColorField
                value={formState.header_background_color || 'transparent'}
                onChange={(headerBackgroundColor) => {
                    updateFormState({header_background_color: headerBackgroundColor} as Partial<TFormState>);
                }}
            />
            <ColorPickerRowField
                swatches={autoAccentSwatches(accentColor, autoHex)}
                title='Post title color'
                value={formState.post_title_color}
                onChange={(postTitleColor) => {
                    updateFormState({post_title_color: postTitleColor} as Partial<TFormState>);
                }}
            />
            <ButtonGroupRowField
                activeKey={formState.title_alignment}
                buttons={[
                    {
                        key: 'left',
                        icon: 'align-left',
                        iconSize: 14,
                        label: 'Align left',
                        tooltip: 'Left',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({title_alignment: 'left'} as Partial<TFormState>)
                    },
                    {
                        key: 'center',
                        icon: 'align-center',
                        iconSize: 14,
                        label: 'Align center',
                        tooltip: 'Center',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({title_alignment: 'center'} as Partial<TFormState>)
                    }
                ]}
                label='Title alignment'
            />
        </Form>
    );
};
