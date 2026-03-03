import {BackgroundColorField} from '../../fields/background-color-field';
import {Form} from '@tryghost/admin-x-design-system';
import {SelectRowField} from '../../fields/select-row-field';
import {fontOptions, fontWeightOptionsByCategory} from '../../design/constants';
import {mapFontWeightForCategory} from '../../design/helpers';
import type {BaseEmailDesignFormState, EmailFontCategory} from '../../types';

type GlobalDesignFieldsProps<TFormState extends BaseEmailDesignFormState> = {
    formState: TFormState;
    updateFormState: (fields: Partial<TFormState>) => void;
};

export const GlobalDesignFields = <TFormState extends BaseEmailDesignFormState>({formState, updateFormState}: GlobalDesignFieldsProps<TFormState>) => {
    const headingFontWeightOptions = fontWeightOptionsByCategory[formState.title_font_category].options;
    const selectedHeadingWeight = mapFontWeightForCategory(formState.title_font_category, formState.title_font_weight);

    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Global'>
            <BackgroundColorField
                value={formState.background_color || 'light'}
                onChange={(backgroundColor) => {
                    updateFormState({background_color: backgroundColor} as Partial<TFormState>);
                }}
            />
            <SelectRowField
                label='Heading font'
                options={fontOptions}
                selectedOption={fontOptions.find(option => option.value === formState.title_font_category)}
                onSelect={(option) => {
                    const titleFontCategory = (option?.value || 'sans_serif') as EmailFontCategory;
                    const nextWeight = mapFontWeightForCategory(titleFontCategory, formState.title_font_weight);
                    updateFormState({title_font_category: titleFontCategory, title_font_weight: nextWeight} as Partial<TFormState>);
                }}
            />
            <SelectRowField
                label='Heading weight'
                options={headingFontWeightOptions}
                selectedOption={headingFontWeightOptions.find(option => option.value === selectedHeadingWeight)}
                onSelect={(option) => {
                    updateFormState({title_font_weight: (option?.value || selectedHeadingWeight)} as Partial<TFormState>);
                }}
            />
            <SelectRowField
                label='Body font'
                options={fontOptions}
                selectedOption={fontOptions.find(option => option.value === formState.body_font_category)}
                testId='body-font-select'
                onSelect={(option) => {
                    updateFormState({body_font_category: (option?.value || 'sans_serif') as EmailFontCategory} as Partial<TFormState>);
                }}
            />
        </Form>
    );
};
