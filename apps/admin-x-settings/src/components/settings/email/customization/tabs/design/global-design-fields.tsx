import {BackgroundColorField} from '../../fields/background-color-field';
import {Form} from '@tryghost/admin-x-design-system';
import {SelectRowField} from '../../fields/select-row-field';
import {fontOptions, fontWeightOptionsByCategory} from '../../design/constants';
import {mapFontWeightForCategory} from '../../design/helpers';
import type {BaseEmailDesignDraft, EmailFontCategory} from '../../types';

type GlobalDesignFieldsProps<TDraft extends BaseEmailDesignDraft> = {
    draft: TDraft;
    updateDraft: (fields: Partial<TDraft>) => void;
};

export const GlobalDesignFields = <TDraft extends BaseEmailDesignDraft>({draft, updateDraft}: GlobalDesignFieldsProps<TDraft>) => {
    const headingFontWeightOptions = fontWeightOptionsByCategory[draft.title_font_category].options;
    const selectedHeadingWeight = mapFontWeightForCategory(draft.title_font_category, draft.title_font_weight);

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Global'>
            <BackgroundColorField
                value={draft.background_color || 'light'}
                onChange={(backgroundColor) => {
                    updateDraft({background_color: backgroundColor} as Partial<TDraft>);
                }}
            />
            <SelectRowField
                label='Heading font'
                options={fontOptions}
                selectedOption={fontOptions.find(option => option.value === draft.title_font_category)}
                onSelect={(option) => {
                    const titleFontCategory = (option?.value || 'sans_serif') as EmailFontCategory;
                    const nextWeight = mapFontWeightForCategory(titleFontCategory, draft.title_font_weight);
                    updateDraft({title_font_category: titleFontCategory, title_font_weight: nextWeight} as Partial<TDraft>);
                }}
            />
            <SelectRowField
                label='Heading weight'
                options={headingFontWeightOptions}
                selectedOption={headingFontWeightOptions.find(option => option.value === selectedHeadingWeight)}
                onSelect={(option) => {
                    updateDraft({title_font_weight: (option?.value || selectedHeadingWeight)} as Partial<TDraft>);
                }}
            />
            <SelectRowField
                label='Body font'
                options={fontOptions}
                selectedOption={fontOptions.find(option => option.value === draft.body_font_category)}
                testId='body-font-select'
                onSelect={(option) => {
                    updateDraft({body_font_category: (option?.value || 'sans_serif') as EmailFontCategory} as Partial<TDraft>);
                }}
            />
        </Form>
    );
};
