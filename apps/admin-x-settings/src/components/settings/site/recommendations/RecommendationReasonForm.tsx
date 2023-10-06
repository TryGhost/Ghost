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
    updateForm: (fn: (state: T) => T) => void,
    clearError?: (key: keyof ErrorMessages) => void,
    setErrors: (errors: ErrorMessages) => void
}

export const validateReasonFormField = function (errors: ErrorMessages, field: 'title'|'reason', value: string|null) {
    const cloned = {...errors};
    switch (field) {
    case 'title':
        if (!value) {
            cloned.title = 'Title is required';
        } else {
            delete cloned.title;
        }
        break;
    case 'reason':
        if (value && value.length > 200) {
            cloned.reason = 'Description cannot be longer than 200 characters';
        } else {
            delete cloned.reason;
        }
        break;
    default:
        // Will throw a compile error if we forget to add a case for a field
        const f: never = field;
        throw new Error(`Unknown field ${f}`);
    }
    return cloned;
};

export const validateReasonForm = function (formState: EditOrAddRecommendation) {
    let newErrors: ErrorMessages = {};
    newErrors = validateReasonFormField(newErrors, 'title', formState.title);
    newErrors = validateReasonFormField(newErrors, 'reason', formState.reason);
    return newErrors;
};

const RecommendationReasonForm: React.FC<Props<EditOrAddRecommendation | Recommendation>> = ({showURL, formState, updateForm, errors, clearError, setErrors}) => {
    const [reasonLength, setReasonLength] = React.useState(formState?.reason?.length || 0);
    const reasonLengthColor = reasonLength > 200 ? 'text-red' : 'text-green';

    // Do an intial validation on mounting
    const didValidate = React.useRef(false);
    React.useEffect(() => {
        if (didValidate.current) {
            return;
        }
        didValidate.current = true;
        setErrors(validateReasonForm(formState));
    }, [formState, setErrors]);

    return <Form
        marginBottom={false}
        marginTop
    >
        <div>
            <Heading className='mb-2 block text-2xs font-semibold uppercase tracking-wider' grey={true} level={6}>Preview</Heading>
            <div className="-mx-8 flex items-center justify-center overflow-hidden border border-grey-100 bg-grey-50 px-7 py-4">
                <div className="w-full rounded bg-white py-3 shadow">
                    <div className="">
                        <a className='flex items-center justify-between  bg-white p-3' href={formState.url} rel="noopener noreferrer" target="_blank">
                            <div className='flex flex-col gap-[2px]'>
                                <div className="flex items-start gap-2">
                                    <RecommendationIcon {...formState} />
                                    <span className='text-[1.6rem] font-semibold text-grey-900'>{formState.title}</span>
                                </div>
                                {formState.reason && <span className='pl-[31px] text-[1.35rem] leading-snug text-grey-700'>{formState.reason}</span>}
                            </div>
                            {formState.one_click_subscribe && <span className='flex whitespace-nowrap pl-6 text-md font-semibold text-green'>Subscribe</span>}
                        </a>
                    </div>
                </div>
            </div>
            {formState.one_click_subscribe && <Hint>This is a Ghost site, so your readers can subscribe with just one click</Hint>}
        </div>

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

        <TextField
            autoFocus={true}
            error={Boolean(errors.title)}
            hint={errors.title}
            title="Title"
            value={formState.title ?? ''}
            onBlur={() => setErrors(
                validateReasonFormField(errors, 'title', formState.title)
            )}
            onChange={(e) => {
                clearError?.('title');
                updateForm(state => ({...state, title: e.target.value}));
            }}
        />
        <TextArea
            clearBg={true}
            error={Boolean(errors.reason)}
            // Note: we don't show the error text here, because errors are related to the character count
            hint={<>Max: <strong>200</strong> characters. You&#8217;ve used <strong className={reasonLengthColor}>{reasonLength}</strong></>}
            rows={4}
            title="Short description"
            value={formState.reason ?? ''}
            onBlur={() => setErrors(
                validateReasonFormField(errors, 'reason', formState.reason)
            )}
            onChange={(e) => {
                clearError?.('reason');
                setReasonLength(e.target.value.length);
                updateForm(state => ({...state, reason: e.target.value}));
            }}
        />
    </Form>;
};

export default RecommendationReasonForm;
