import {Form, Toggle} from '@tryghost/admin-x-design-system';
import type {NewsletterCustomizationDraft} from '../../types';

type NewsletterTitleSectionContentFieldsProps = {
    draft: NewsletterCustomizationDraft;
    updateDraft: (fields: Partial<NewsletterCustomizationDraft>) => void;
};

const NewsletterTitleSectionContentFields: React.FC<NewsletterTitleSectionContentFieldsProps> = ({draft, updateDraft}) => {
    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Title section'>
            <Toggle
                checked={draft.show_post_title_section}
                direction='rtl'
                label='Post title'
                onChange={(event) => {
                    updateDraft({show_post_title_section: event.target.checked});
                }}
            />
            {draft.show_post_title_section && (
                <Toggle
                    checked={draft.show_excerpt}
                    direction='rtl'
                    label='Post excerpt'
                    onChange={(event) => {
                        updateDraft({show_excerpt: event.target.checked});
                    }}
                />
            )}
            <Toggle
                checked={draft.show_feature_image}
                direction='rtl'
                label='Feature image'
                onChange={(event) => {
                    updateDraft({show_feature_image: event.target.checked});
                }}
            />
        </Form>
    );
};

export default NewsletterTitleSectionContentFields;
