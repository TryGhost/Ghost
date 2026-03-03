import {EmailFooterField} from '../../fields/email-footer-field';
import {Form, Toggle, ToggleGroup} from '@tryghost/admin-x-design-system';
import {HeaderImageField} from '../../fields/header-image-field';
import type {AutomationCustomizationFormState} from '../../types';

type AutomationContentFieldsProps = {
    formState: AutomationCustomizationFormState;
    updateFormState: (fields: Partial<AutomationCustomizationFormState>) => void;
};

const AutomationContentFields: React.FC<AutomationContentFieldsProps> = ({formState, updateFormState}) => {
    return (
        <Form className='mt-6' gap='sm' margins='lg' title='Content'>
            <HeaderImageField
                value={formState.header_image}
                onChange={(headerImage) => {
                    updateFormState({header_image: headerImage});
                }}
            />
            <ToggleGroup>
                <Toggle
                    checked={formState.show_header_title}
                    direction='rtl'
                    label='Publication title'
                    onChange={(event) => {
                        updateFormState({show_header_title: event.target.checked});
                    }}
                />
            </ToggleGroup>
            <EmailFooterField
                value={formState.footer_content || ''}
                onChange={(footerContent) => {
                    updateFormState({footer_content: footerContent});
                }}
            />
        </Form>
    );
};

export default AutomationContentFields;
