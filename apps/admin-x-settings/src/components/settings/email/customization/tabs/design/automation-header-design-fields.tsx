import {Form} from '@tryghost/admin-x-design-system';
import {HeaderBackgroundColorField} from '../../fields/header-background-color-field';
import type {BaseEmailDesignFormState} from '../../types';

type AutomationHeaderDesignFieldsProps<TFormState extends BaseEmailDesignFormState> = {
    formState: TFormState;
    updateFormState: (fields: Partial<TFormState>) => void;
};

export const AutomationHeaderDesignFields = <TFormState extends BaseEmailDesignFormState>({formState, updateFormState}: AutomationHeaderDesignFieldsProps<TFormState>) => {
    return (
        <Form className='mt-6' gap='xs' margins='lg' title='Header'>
            <HeaderBackgroundColorField
                value={formState.header_background_color || 'transparent'}
                onChange={(headerBackgroundColor) => {
                    updateFormState({header_background_color: headerBackgroundColor} as Partial<TFormState>);
                }}
            />
        </Form>
    );
};
