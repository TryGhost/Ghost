import Avatar from '../../../../admin-x-ds/global/Avatar';
import Form from '../../../../admin-x-ds/global/form/Form';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import {EditOrAddRecommendation, Recommendation} from '../../../../api/recommendations';

interface Props<T extends EditOrAddRecommendation> {
    formState: T,
    updateForm: (fn: (state: T) => T) => void
}

const RecommendationReasonForm: React.FC<Props<EditOrAddRecommendation | Recommendation>> = ({formState, updateForm}) => {
    return <Form
        marginBottom={false}
        marginTop
    >
        <div className='mb-4 flex items-center gap-3 rounded-sm border border-grey-300 p-3'>
            {(formState.favicon || formState.featured_image) && <Avatar image={formState.favicon ?? formState.featured_image!} labelColor='white' />}
            <div className={`flex grow flex-col`}>
                <span className='mb-0.5 font-medium'>{formState.title}</span>
                <span className='text-xs leading-snug text-grey-700'>{formState.url}</span>
            </div>
        </div>
        <TextArea
            clearBg={true}
            rows={3}
            title="Reason for recommending"
            value={formState.reason ?? ''}
            onChange={e => updateForm(state => ({...state, reason: e.target.value}))}
        />
    </Form>;
};

export default RecommendationReasonForm;
