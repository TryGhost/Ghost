import {Form, Toggle} from '@tryghost/admin-x-design-system';
import type {NewsletterCustomizationFormState} from '../../types';

type NewsletterTitleSectionContentFieldsProps = {
    formState: NewsletterCustomizationFormState;
    updateFormState: (fields: Partial<NewsletterCustomizationFormState>) => void;
};

const NewsletterTitleSectionContentFields: React.FC<NewsletterTitleSectionContentFieldsProps> = ({formState, updateFormState}) => {
    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Title section'>
            <Toggle
                checked={formState.show_post_title_section}
                direction='rtl'
                label='Post title'
                onChange={(event) => {
                    updateFormState({show_post_title_section: event.target.checked});
                }}
            />
            {formState.show_post_title_section && (
                <Toggle
                    checked={formState.show_excerpt}
                    direction='rtl'
                    label='Post excerpt'
                    onChange={(event) => {
                        updateFormState({show_excerpt: event.target.checked});
                    }}
                />
            )}
            <Toggle
                checked={formState.show_feature_image}
                direction='rtl'
                label='Feature image'
                onChange={(event) => {
                    updateFormState({show_feature_image: event.target.checked});
                }}
            />
        </Form>
    );
};

export default NewsletterTitleSectionContentFields;
