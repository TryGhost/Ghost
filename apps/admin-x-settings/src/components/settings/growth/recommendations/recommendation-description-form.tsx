import React from 'react';
import RecommendationIcon from './recommendation-icon';
import {type EditOrAddRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {type ErrorMessages} from '@tryghost/admin-x-framework/hooks';
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input, Textarea} from '@tryghost/shade/components';
import {Text} from '@tryghost/shade/primitives';
import {formatNumber} from '@tryghost/shade/utils';

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
    default: {
        // Will throw a compile error if we forget to add a case for a field
        const f: never = field;
        throw new Error(`Unknown field ${f}`);
    }
    }
    return cloned;
};

export const validateDescriptionForm = function (formState: EditOrAddRecommendation) {
    let newErrors: ErrorMessages = {};
    newErrors = validateDescriptionFormField(newErrors, 'title', formState.title);
    newErrors = validateDescriptionFormField(newErrors, 'description', formState.description);
    return newErrors;
};

function RecommendationDescriptionForm<T extends EditOrAddRecommendation>({showURL, formState, updateForm, errors, clearError, setErrors}: Props<T>) {
    const [descriptionLength, setDescriptionLength] = React.useState(formState?.description?.length || 0);
    const descriptionLengthColor = descriptionLength > 200 ? 'text-destructive' : 'text-foreground';

    // Do an intial validation on mounting
    const didValidate = React.useRef(false);
    React.useEffect(() => {
        if (didValidate.current) {
            return;
        }
        didValidate.current = true;
        setErrors(validateDescriptionForm(formState));
    }, [formState, setErrors]);

    return <FieldGroup className='mt-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
        <div>
            <Text as='h6' className='mb-2 block tracking-wider uppercase' leading='normal' size='xs' tone='secondary' weight='semibold'>Preview</Text>
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
                            {formState.one_click_subscribe && <span className='flex pl-6 text-md font-semibold whitespace-nowrap text-green'>Subscribe</span>}
                        </a>
                    </div>
                </div>
            </div>
            {formState.one_click_subscribe && <FieldDescription className='mt-1'>This is a Ghost site, so your readers can subscribe with just one click</FieldDescription>}
        </div>

        {showURL && (
            <Field data-disabled='true'>
                <FieldLabel htmlFor='recommendation-url'>URL</FieldLabel>
                <Input className='h-[var(--control-height)] border-transparent bg-muted' id='recommendation-url' value={formState.url} disabled />
            </Field>
        )}

        <Field data-invalid={Boolean(errors.title) || undefined}>
            <FieldLabel htmlFor='recommendation-title'>Title</FieldLabel>
            <Input aria-invalid={Boolean(errors.title) || undefined} id='recommendation-title' maxLength={2000} value={formState.title ?? ''} autoFocus onChange={(e) => {
                clearError?.('title');
                updateForm(state => ({...state, title: e.target.value}));
            }} />
            {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>
        <Field data-invalid={Boolean(errors.description) || undefined}>
            <FieldLabel htmlFor='recommendation-description'>Short description</FieldLabel>
            <Textarea
                aria-invalid={Boolean(errors.description) || undefined}
                className='border-transparent bg-muted'
                id='recommendation-description'
                rows={4}
                value={formState.description ?? ''}
                onChange={(e) => {
                    clearError?.('description');
                    setDescriptionLength(e.target.value.length);
                    updateForm(state => ({...state, description: e.target.value}));
                }}
            />
            <FieldDescription>Max: <strong>{formatNumber(200)}</strong> characters. You&#8217;ve used <strong className={descriptionLengthColor}>{formatNumber(descriptionLength)}</strong></FieldDescription>
        </Field>
    </FieldGroup>;
}

export default RecommendationDescriptionForm;
