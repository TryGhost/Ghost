import {Form, Toggle, ToggleGroup} from '@tryghost/admin-x-design-system';
import {HeaderImageField} from '../../fields/header-image-field';
import type {NewsletterCustomizationDraft} from '../../types';

type NewsletterHeaderContentFieldsProps = {
    draft: NewsletterCustomizationDraft;
    siteIcon: string | null;
    updateDraft: (fields: Partial<NewsletterCustomizationDraft>) => void;
};

const NewsletterHeaderContentFields: React.FC<NewsletterHeaderContentFieldsProps> = ({draft, siteIcon, updateDraft}) => {
    return (
        <Form className='mt-6' gap='sm' margins='lg' title='Header'>
            <HeaderImageField
                value={draft.header_image}
                onChange={(headerImage) => {
                    updateDraft({header_image: headerImage});
                }}
            />
            <ToggleGroup>
                {siteIcon && <Toggle
                    checked={draft.show_header_icon}
                    direction='rtl'
                    label='Publication icon'
                    onChange={(event) => {
                        updateDraft({show_header_icon: event.target.checked});
                    }}
                />}
                <Toggle
                    checked={draft.show_header_title}
                    direction='rtl'
                    label='Publication title'
                    onChange={(event) => {
                        updateDraft({show_header_title: event.target.checked});
                    }}
                />
                <Toggle
                    checked={draft.show_header_name}
                    direction='rtl'
                    label='Newsletter name'
                    onChange={(event) => {
                        updateDraft({show_header_name: event.target.checked});
                    }}
                />
            </ToggleGroup>
        </Form>
    );
};

export default NewsletterHeaderContentFields;
