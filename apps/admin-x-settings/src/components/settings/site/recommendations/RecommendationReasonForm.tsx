import Avatar from '../../../../admin-x-ds/global/Avatar';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {EditOrAddRecommendation, Recommendation} from '../../../../api/recommendations';
import {ErrorMessages} from '../../../../hooks/useForm';

interface Props<T extends EditOrAddRecommendation> {
    formState: T,
    errors: ErrorMessages,
    updateForm: (fn: (state: T) => T) => void
}

const RecommendationReasonForm: React.FC<Props<EditOrAddRecommendation | Recommendation>> = ({formState, updateForm, errors}) => {
    return <Form
        marginBottom={false}
        marginTop
    >
        <div>
            <Heading className='mb-2 block text-2xs font-semibold uppercase tracking-wider text-grey-700'>Preview</Heading>
            <a className='flex items-center gap-3 rounded-sm border border-grey-300 p-3' href={formState.url} rel="noopener noreferrer" target="_blank">
                {(formState.favicon || formState.featured_image) && <Avatar image={formState.favicon ?? formState.featured_image!} labelColor='white' />}
                <div className={`flex grow flex-col`}>
                    <span className='word-wrap mb-0.5 font-medium'>{formState.title}</span>
                    <span className='word-wrap text-xs leading-snug text-grey-700'>{formState.url}</span>
                </div>
            </a>
        </div>
        <TextField
            error={Boolean(errors.title)}
            hint={errors.title}
            title="Title"
            value={formState.title ?? ''}
            onChange={e => updateForm(state => ({...state, title: e.target.value}))}
        />
        <TextArea
            clearBg={true}
            rows={3}
            title="Reason for recommending (optional)"
            value={formState.reason ?? ''}
            onChange={e => updateForm(state => ({...state, reason: e.target.value}))}
        />
    </Form>;
};

export default RecommendationReasonForm;
