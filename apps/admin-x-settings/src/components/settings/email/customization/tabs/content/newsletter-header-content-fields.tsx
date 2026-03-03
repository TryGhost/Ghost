import {Form, Toggle, ToggleGroup} from '@tryghost/admin-x-design-system';
import {HeaderImageField} from '../../fields/header-image-field';
import type {NewsletterCustomizationFormState} from '../../types';

type NewsletterHeaderContentFieldsProps = {
    formState: NewsletterCustomizationFormState;
    siteIcon: string | null;
    updateFormState: (fields: Partial<NewsletterCustomizationFormState>) => void;
};

const NewsletterHeaderContentFields: React.FC<NewsletterHeaderContentFieldsProps> = ({formState, siteIcon, updateFormState}) => {
    return (
        <Form className='mt-6' gap='sm' margins='lg' title='Header'>
            <HeaderImageField
                value={formState.header_image}
                onChange={(headerImage) => {
                    updateFormState({header_image: headerImage});
                }}
            />
            <ToggleGroup>
                {siteIcon && <Toggle
                    checked={formState.show_header_icon}
                    direction='rtl'
                    label='Publication icon'
                    onChange={(event) => {
                        updateFormState({show_header_icon: event.target.checked});
                    }}
                />}
                <Toggle
                    checked={formState.show_header_title}
                    direction='rtl'
                    label='Publication title'
                    onChange={(event) => {
                        updateFormState({show_header_title: event.target.checked});
                    }}
                />
                <Toggle
                    checked={formState.show_header_name}
                    direction='rtl'
                    label='Newsletter name'
                    onChange={(event) => {
                        updateFormState({show_header_name: event.target.checked});
                    }}
                />
            </ToggleGroup>
        </Form>
    );
};

export default NewsletterHeaderContentFields;
