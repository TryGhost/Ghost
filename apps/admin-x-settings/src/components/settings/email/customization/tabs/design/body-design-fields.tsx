import {ButtonGroupRowField} from '../../fields/button-group-row-field';
import {ColorPickerRowField} from '../../fields/color-picker-row-field';
import {Form} from '@tryghost/admin-x-design-system';
import {accentAutoSwatches, dividerColorSwatches} from '../../design/constants';
import {isBackgroundDark} from '../../design/helpers';
import type {BaseEmailDesignFormState} from '../../types';

type BodyDesignFieldsProps<TFormState extends BaseEmailDesignFormState> = {
    formState: TFormState;
    accentColor: string;
    sectionTitleLabel?: string;
    updateFormState: (fields: Partial<TFormState>) => void;
};

export const BodyDesignFields = <TFormState extends BaseEmailDesignFormState>({formState, accentColor, sectionTitleLabel = 'Section title color', updateFormState}: BodyDesignFieldsProps<TFormState>) => {
    const autoHex = isBackgroundDark(formState.background_color) ? '#ffffff' : '#000000';

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Body'>
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title={sectionTitleLabel}
                value={formState.section_title_color}
                onChange={(sectionTitleColor) => {
                    updateFormState({section_title_color: sectionTitleColor} as Partial<TFormState>);
                }}
            />
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title='Button color'
                value={formState.button_color}
                onChange={(buttonColor) => {
                    updateFormState({button_color: buttonColor} as Partial<TFormState>);
                }}
            />
            <ButtonGroupRowField
                activeKey={formState.button_style}
                buttons={[
                    {
                        key: 'fill',
                        icon: 'squircle-fill',
                        iconSize: 14,
                        label: 'Fill',
                        tooltip: 'Fill',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({button_style: 'fill'} as Partial<TFormState>)
                    },
                    {
                        key: 'outline',
                        icon: 'squircle',
                        iconSize: 14,
                        label: 'Outline',
                        tooltip: 'Outline',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({button_style: 'outline'} as Partial<TFormState>)
                    }
                ]}
                label='Button style'
            />
            <ButtonGroupRowField
                activeKey={formState.button_corners}
                buttons={[
                    {
                        key: 'square',
                        icon: 'square',
                        iconSize: 14,
                        label: 'Square',
                        tooltip: 'Square',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({button_corners: 'square'} as Partial<TFormState>)
                    },
                    {
                        key: 'rounded',
                        icon: 'squircle',
                        iconSize: 14,
                        label: 'Rounded',
                        tooltip: 'Rounded',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({button_corners: 'rounded'} as Partial<TFormState>)
                    },
                    {
                        key: 'pill',
                        icon: 'circle',
                        iconSize: 14,
                        label: 'Pill',
                        tooltip: 'Pill',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({button_corners: 'pill'} as Partial<TFormState>)
                    }
                ]}
                label='Button corners'
            />
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title='Link color'
                value={formState.link_color}
                onChange={(linkColor) => {
                    updateFormState({link_color: linkColor} as Partial<TFormState>);
                }}
            />
            <ButtonGroupRowField
                activeKey={formState.link_style}
                buttons={[
                    {
                        key: 'underline',
                        icon: 'text-underline',
                        iconSize: 14,
                        label: 'Underline',
                        tooltip: 'Underline',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({link_style: 'underline'} as Partial<TFormState>)
                    },
                    {
                        key: 'regular',
                        icon: 'text-regular',
                        iconSize: 14,
                        label: 'Regular',
                        tooltip: 'Regular',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({link_style: 'regular'} as Partial<TFormState>)
                    },
                    {
                        key: 'bold',
                        icon: 'text-bold',
                        iconSize: 14,
                        label: 'Bold',
                        tooltip: 'Bold',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({link_style: 'bold'} as Partial<TFormState>)
                    }
                ]}
                label='Link style'
            />
            <ButtonGroupRowField
                activeKey={formState.image_corners}
                buttons={[
                    {
                        key: 'square',
                        icon: 'square',
                        iconSize: 14,
                        label: 'Square',
                        tooltip: 'Square',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({image_corners: 'square'} as Partial<TFormState>)
                    },
                    {
                        key: 'rounded',
                        icon: 'squircle',
                        iconSize: 14,
                        label: 'Rounded',
                        tooltip: 'Rounded',
                        hideLabel: true,
                        link: false,
                        size: 'sm',
                        onClick: () => updateFormState({image_corners: 'rounded'} as Partial<TFormState>)
                    }
                ]}
                label='Image corners'
            />
            <ColorPickerRowField
                swatches={dividerColorSwatches(accentColor)}
                title='Divider color'
                value={formState.divider_color || 'light'}
                onChange={(dividerColor) => {
                    updateFormState({divider_color: dividerColor || 'light'} as Partial<TFormState>);
                }}
            />
        </Form>
    );
};
