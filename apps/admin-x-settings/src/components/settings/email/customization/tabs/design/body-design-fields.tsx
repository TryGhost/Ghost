import {ButtonGroupRowField} from '../../fields/button-group-row-field';
import {ColorPickerRowField} from '../../fields/color-picker-row-field';
import {Form} from '@tryghost/admin-x-design-system';
import {accentAutoSwatches, dividerColorSwatches} from '../../design/constants';
import {isBackgroundDark} from '../../design/helpers';
import type {BaseEmailDesignDraft} from '../../types';

type BodyDesignFieldsProps<TDraft extends BaseEmailDesignDraft> = {
    draft: TDraft;
    accentColor: string;
    sectionTitleLabel?: string;
    updateDraft: (fields: Partial<TDraft>) => void;
};

export const BodyDesignFields = <TDraft extends BaseEmailDesignDraft>({draft, accentColor, sectionTitleLabel = 'Section title color', updateDraft}: BodyDesignFieldsProps<TDraft>) => {
    const autoHex = isBackgroundDark(draft.background_color) ? '#ffffff' : '#000000';

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Body'>
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title={sectionTitleLabel}
                value={draft.section_title_color}
                onChange={(sectionTitleColor) => {
                    updateDraft({section_title_color: sectionTitleColor} as Partial<TDraft>);
                }}
            />
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title='Button color'
                value={draft.button_color}
                onChange={(buttonColor) => {
                    updateDraft({button_color: buttonColor} as Partial<TDraft>);
                }}
            />
            <ButtonGroupRowField
                activeKey={draft.button_style}
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
                        onClick: () => updateDraft({button_style: 'fill'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({button_style: 'outline'} as Partial<TDraft>)
                    }
                ]}
                label='Button style'
            />
            <ButtonGroupRowField
                activeKey={draft.button_corners}
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
                        onClick: () => updateDraft({button_corners: 'square'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({button_corners: 'rounded'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({button_corners: 'pill'} as Partial<TDraft>)
                    }
                ]}
                label='Button corners'
            />
            <ColorPickerRowField
                swatches={accentAutoSwatches(accentColor, autoHex)}
                title='Link color'
                value={draft.link_color}
                onChange={(linkColor) => {
                    updateDraft({link_color: linkColor} as Partial<TDraft>);
                }}
            />
            <ButtonGroupRowField
                activeKey={draft.link_style}
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
                        onClick: () => updateDraft({link_style: 'underline'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({link_style: 'regular'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({link_style: 'bold'} as Partial<TDraft>)
                    }
                ]}
                label='Link style'
            />
            <ButtonGroupRowField
                activeKey={draft.image_corners}
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
                        onClick: () => updateDraft({image_corners: 'square'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({image_corners: 'rounded'} as Partial<TDraft>)
                    }
                ]}
                label='Image corners'
            />
            <ColorPickerRowField
                swatches={dividerColorSwatches(accentColor)}
                title='Divider color'
                value={draft.divider_color || 'light'}
                onChange={(dividerColor) => {
                    updateDraft({divider_color: dividerColor || 'light'} as Partial<TDraft>);
                }}
            />
        </Form>
    );
};
