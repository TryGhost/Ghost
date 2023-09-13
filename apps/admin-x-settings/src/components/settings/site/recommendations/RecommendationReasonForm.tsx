import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';
import RecommendationIcon from './RecommendationIcon';
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
            <Heading className='mb-2 block text-2xs font-semibold uppercase tracking-wider' grey={true} level={6}>Preview</Heading>
            <a className='flex flex-col rounded-sm border border-grey-300 p-3' href={formState.url} rel="noopener noreferrer" target="_blank">
                <div className="mb-1 flex items-center gap-2">
                    <RecommendationIcon {...formState} />
                    <span className='line-clamp-1 font-medium'>{formState.title}</span>
                </div>
                <span className='line-clamp-1 text-xs leading-snug text-grey-700'>{formState.url}</span>
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
            title="Description (optional)"
            value={formState.reason ?? ''}
            onChange={e => updateForm(state => ({...state, reason: e.target.value}))}
        />
    </Form>;
};

export default RecommendationReasonForm;
