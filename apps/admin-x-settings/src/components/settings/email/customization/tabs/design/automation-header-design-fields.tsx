import {Form} from '@tryghost/admin-x-design-system';
import {HeaderBackgroundColorField} from '../../fields/header-background-color-field';
import type {BaseEmailDesignDraft} from '../../types';

type AutomationHeaderDesignFieldsProps<TDraft extends BaseEmailDesignDraft> = {
    draft: TDraft;
    updateDraft: (fields: Partial<TDraft>) => void;
};

export const AutomationHeaderDesignFields = <TDraft extends BaseEmailDesignDraft>({draft, updateDraft}: AutomationHeaderDesignFieldsProps<TDraft>) => {
    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Header'>
            <HeaderBackgroundColorField
                value={draft.header_background_color || 'transparent'}
                onChange={(headerBackgroundColor) => {
                    updateDraft({header_background_color: headerBackgroundColor} as Partial<TDraft>);
                }}
            />
        </Form>
    );
};
