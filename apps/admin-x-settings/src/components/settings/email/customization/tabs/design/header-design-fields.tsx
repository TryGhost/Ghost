import {ButtonGroupRowField} from '../../fields/button-group-row-field';
import {ColorPickerRowField} from '../../fields/color-picker-row-field';
import {Form} from '@tryghost/admin-x-design-system';
import {HeaderBackgroundColorField} from '../../fields/header-background-color-field';
import {autoAccentSwatches} from '../../design/constants';
import {isBackgroundDark} from '../../design/helpers';
import type {BaseEmailDesignDraft, NewsletterDesignDraft} from '../../types';

type HeaderDesignFieldsProps<TDraft extends BaseEmailDesignDraft & NewsletterDesignDraft> = {
    draft: TDraft;
    accentColor: string;
    updateDraft: (fields: Partial<TDraft>) => void;
};

export const HeaderDesignFields = <TDraft extends BaseEmailDesignDraft & NewsletterDesignDraft>({draft, accentColor, updateDraft}: HeaderDesignFieldsProps<TDraft>) => {
    const autoHex = isBackgroundDark(draft.background_color) ? '#ffffff' : '#000000';

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Header'>
            <HeaderBackgroundColorField
                value={draft.header_background_color || 'transparent'}
                onChange={(headerBackgroundColor) => {
                    updateDraft({header_background_color: headerBackgroundColor} as Partial<TDraft>);
                }}
            />
            <ColorPickerRowField
                swatches={autoAccentSwatches(accentColor, autoHex)}
                title='Post title color'
                value={draft.post_title_color}
                onChange={(postTitleColor) => {
                    updateDraft({post_title_color: postTitleColor} as Partial<TDraft>);
                }}
            />
            <ButtonGroupRowField
                activeKey={draft.title_alignment}
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
                        onClick: () => updateDraft({title_alignment: 'left'} as Partial<TDraft>)
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
                        onClick: () => updateDraft({title_alignment: 'center'} as Partial<TDraft>)
                    }
                ]}
                label='Title alignment'
            />
        </Form>
    );
};
