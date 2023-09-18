import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import React from 'react';
import RecommendationIcon from './RecommendationIcon';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import {EditOrAddRecommendation, Recommendation} from '../../../../api/recommendations';
import {ErrorMessages} from '../../../../hooks/useForm';

interface Props<T extends EditOrAddRecommendation> {
    showURL?: boolean,
    formState: T,
    errors: ErrorMessages,
    updateForm: (fn: (state: T) => T) => void
}

const RecommendationReasonForm: React.FC<Props<EditOrAddRecommendation | Recommendation>> = ({showURL, formState, updateForm, errors}) => {
    return <Form
        marginBottom={false}
        marginTop
    >
        {showURL && <URLTextField
            disabled={true}
            title='URL'
            value={formState.url}
            onChange={u => updateForm((state) => {
                return {
                    ...state,
                    url: u
                };
            })}
        />}

        <div>
            <Heading className='mb-2 block text-2xs font-semibold uppercase tracking-wider' grey={true} level={6}>Preview</Heading>
            <a className='flex flex-col rounded-sm border border-grey-300 p-3' href={formState.url} rel="noopener noreferrer" target="_blank">
                <div className="flex items-center gap-2">
                    <RecommendationIcon {...formState} />
                    <span className='text-[1.6rem] font-semibold text-grey-900'>{formState.title}</span>
                </div>
                <span className='mb-1 text-md font-medium leading-snug text-grey-700'>{formState.reason}</span>
            </a>
            {formState.one_click_subscribe && <Hint>This is a Ghost site, so your readers can subscribe with just one click</Hint>}
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
