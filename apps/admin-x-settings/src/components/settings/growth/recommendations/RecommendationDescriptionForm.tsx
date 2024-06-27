import React from 'react';
import RecommendationIcon from './RecommendationIcon';
import {EditOrAddRecommendation, Recommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {ErrorMessages} from '@tryghost/admin-x-framework/hooks';
import {Form, Heading, Hint, TextArea, TextField, URLTextField} from '@tryghost/admin-x-design-system';

interface Props<T extends EditOrAddRecommendation> {
    showURL?: boolean,
    formState: T,
    errors: ErrorMessages,
    updateForm: (fn: (state: T) => T) => void,
    clearError?: (key: keyof ErrorMessages) => void,
    setErrors: (errors: ErrorMessages) => void
}

export const validateDescriptionFormField = function (errors: ErrorMessages, field: 'title'|'description', value: string|null) {
    const cloned = {...errors};
    switch (field) {
    case 'title':
        if (!value) {
            cloned.title = 'Title is required';
        } else {
            delete cloned.title;
        }
        break;
    case 'description':
        if (value && value.length > 200) {
            cloned.description = 'Description cannot be longer than 200 characters';
        } else {
            delete cloned.description;
        }
        break;
    default:
        // Will throw a compile error if we forget to add a case for a field
        const f: never = field;
        throw new Error(`Unknown field ${f}`);
    }
    return cloned;
};

export const validateDescriptionForm = function (formState: EditOrAddRecommendation) {
    let newErrors: ErrorMessages = {};
    newErrors = validateDescriptionFormField(newErrors, 'title', formState.title);
    newErrors = validateDescriptionFormField(newErrors, 'description', formState.description);
    return newErrors;
};

const RecommendationDescriptionForm: React.FC<Props<EditOrAddRecommendation | Recommendation>> = ({showURL, formState, updateForm, errors, clearError, setErrors}) => {
    const [descriptionLength, setDescriptionLength] = React.useState(formState?.description?.length || 0);
    const descriptionLengthColor = descriptionLength > 200 ? 'text-red' : 'text-green';

    // Do an intial validation on mounting
    const didValidate = React.useRef(false);
    React.useEffect(() => {
        if (didValidate.current) {
            return;
        }
        didValidate.current = true;
        setErrors(validateDescriptionForm(formState));
    }, [formState, setErrors]);

    return <Form
        marginBottom={false}
        marginTop
    >
        <div>
            <Heading className='mb-2 block text-2xs font-semibold uppercase tracking-wider' grey={true} level={6}>Preview</Heading>
            <div className="-mx-8 flex items-center justify-center overflow-hidden border-y border-grey-100 bg-grey-50 px-7 py-4 dark:border-grey-950 dark:bg-black">
                <div className="w-full rounded bg-white py-3 shadow">
                    <div className="">
                        <a className='flex items-center justify-between bg-white px-5 py-3' href={formState.url} rel="noopener noreferrer" target="_blank">
                            <div className='flex flex-col gap-[2px]'>
                                <div className="flex items-start gap-2">
                                    <RecommendationIcon {...formState} />
                                    <span className='text-[1.6rem] font-semibold text-grey-900'>{formState.title}</span>
                                </div>
                                {formState.description && <span className='pl-[31px] text-[1.35rem] leading-snug text-grey-700'>{formState.description}</span>}
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
                    url: u || ''
                };
            })}
        />}

        <TextField
            autoFocus={true}
            error={Boolean(errors.title)}
            hint={errors.title}
            maxLength={2000}
            title="Title"
            value={formState.title ?? ''}
            onChange={(e) => {
                clearError?.('title');
                updateForm(state => ({...state, title: e.target.value}));
            }}
        />
        <TextArea
            error={Boolean(errors.description)}
            // Note: we don't show the error text here, because errors are related to the character count
            hint={<>Max: <strong>200</strong> characters. You&#8217;ve used <strong className={descriptionLengthColor}>{descriptionLength}</strong></>}
            rows={4}
            title="Short description"
            value={formState.description ?? ''}
            onChange={(e) => {
                clearError?.('description');
                setDescriptionLength(e.target.value.length);
                updateForm(state => ({...state, description: e.target.value}));
            }}
        />
    </Form>;
};

export default RecommendationDescriptionForm;
