import {EmailFooterField} from '../../fields/email-footer-field';
import {Form, Toggle, ToggleGroup} from '@tryghost/admin-x-design-system';
import {HeaderImageField} from '../../fields/header-image-field';
import type {AutomationCustomizationDraft} from '../../types';

type AutomationContentFieldsProps = {
    draft: AutomationCustomizationDraft;
    updateDraft: (fields: Partial<AutomationCustomizationDraft>) => void;
};

const AutomationContentFields: React.FC<AutomationContentFieldsProps> = ({draft, updateDraft}) => {
    return (
        <Form className='mt-6' gap='sm' margins='lg' title='Content'>
            <HeaderImageField
                value={draft.header_image}
                onChange={(headerImage) => {
                    updateDraft({header_image: headerImage});
                }}
            />
            <ToggleGroup>
                <Toggle
                    checked={draft.show_header_title}
                    direction='rtl'
                    label='Publication title'
                    onChange={(event) => {
                        updateDraft({show_header_title: event.target.checked});
                    }}
                />
            </ToggleGroup>
            <EmailFooterField
                value={draft.footer_content || ''}
                onChange={(footerContent) => {
                    updateDraft({footer_content: footerContent});
                }}
            />
        </Form>
    );
};

export default AutomationContentFields;
