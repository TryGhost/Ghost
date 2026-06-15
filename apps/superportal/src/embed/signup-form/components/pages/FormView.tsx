import {type FormEventHandler, useId, useState, type ReactElement} from 'react';
import {SpinnerIcon} from '../icons/SpinnerIcon';
import {useAppContext} from '../../app-context';

interface FormSharedProps {
    buttonColor?: string;
    buttonTextColor?: string;
    loading: boolean;
    success: boolean;
    error?: string;
    onSubmit: (values: {email: string}) => void;
}

interface FormViewProps extends FormSharedProps {
    isMinimal: boolean;
    title?: string;
    description?: string;
    icon?: string;
    backgroundColor?: string;
    textColor?: string;
    errorMessageId?: string;
}

export function FormView({
    isMinimal,
    title,
    description,
    icon,
    backgroundColor,
    textColor,
    error,
    ...formProps
}: FormViewProps): ReactElement {
    const errorMessageId = useId();

    if (isMinimal) {
        return (
            <>
                <Form error={error} errorMessageId={errorMessageId} isMinimal={isMinimal} {...formProps} />
                {error && (
                    <p className="text-red-500" data-testid="error-message" id={errorMessageId}>
                        {error}
                    </p>
                )}
            </>
        );
    }

    return (
        <div
            className="flex h-[100vh] flex-col items-center justify-center px-4 sm:px-6 md:px-10"
            data-testid="wrapper"
            style={{backgroundColor, color: textColor}}
        >
            {icon && <img alt={title} className="mb-2 h-[64px] w-auto" src={icon} />}
            {title && (
                <h1 className="text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">
                    {title}
                </h1>
            )}
            {description && (
                <p className="mb-4 text-center font-medium md:mb-5">{description}</p>
            )}
            <div className="relative w-full max-w-[440px]">
                <Form error={error} errorMessageId={errorMessageId} {...formProps} />
                <p
                    className={`h-5 w-full text-left text-red-500 ${error ? 'visible' : 'invisible'}`}
                    data-testid="error-message"
                    id={errorMessageId}
                >
                    {error}
                </p>
            </div>
        </div>
    );
}

interface FormProps extends FormSharedProps {
    isMinimal?: boolean;
    errorMessageId?: string;
}

function Form({
    isMinimal,
    loading,
    success,
    error,
    errorMessageId,
    buttonColor,
    buttonTextColor,
    onSubmit
}: FormProps): ReactElement {
    const [email, setEmail] = useState('');
    const {t} = useAppContext();

    const submitHandler: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        onSubmit({email});
    };

    const isDisabled = loading || success;

    // Transition classes use the visibility step-start/step-end trick so that
    // screen readers track the correct visible state, not just opacity.
    const subscribeLabelVisible =
        'opacity-1 [transition:opacity_200ms,visibility_200ms_step-start] visible';
    const subscribeLabelHidden =
        '[transition:opacity_200ms,visibility_200ms_step-end] invisible opacity-0';

    const emailSentVisible =
        'opacity-1 visible mx-0 [transition:margin_300ms,opacity_200ms,visibility_200ms_step-start]';
    const emailSentHidden =
        'invisible mx-[-40px] opacity-0 [transition:margin_300ms,opacity_200ms,visibility_200ms_step-end]';

    const spinnerVisible =
        'opacity-1 [transition:opacity_200ms,visibility_200ms_step-start] visible';
    const spinnerHidden =
        '[transition:opacity_200ms,visibility_200ms_step-end] invisible opacity-0';

    return (
        <form
            className={`relative flex w-full rounded-[.5rem] border bg-white p-[3px] text-grey-900 transition hover:border-grey-400 focus-visible:border-grey-500 ${error ? '!border-red-500' : 'border-grey-300'}`}
            noValidate={true}
            onSubmit={submitHandler}
        >
            <input
                aria-describedby={error && errorMessageId ? errorMessageId : undefined}
                aria-invalid={!!error}
                autoComplete="email"
                className="w-full px-2 py-1 focus-visible:outline-none disabled:bg-white xs:p-2"
                data-testid="input"
                disabled={isDisabled}
                placeholder={t('Your email address')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <button
                className="my-auto grid h-7 touch-manipulation grid-cols-[1fr] items-center rounded-[.3rem] px-2 font-medium text-white xs:h-[3rem] xs:px-3"
                data-testid="button"
                disabled={isDisabled}
                style={{backgroundColor: buttonColor, color: buttonTextColor}}
                type="submit"
            >
                <span
                    className={`col-start-1 row-start-1 whitespace-nowrap ${isDisabled ? subscribeLabelHidden : subscribeLabelVisible}`}
                >
                    {t('Subscribe')}
                </span>
                {isMinimal && (
                    <span
                        className={`col-start-1 row-start-1 whitespace-nowrap ${loading || !success ? emailSentHidden : emailSentVisible}`}
                    >
                        {t('Email sent')}
                    </span>
                )}
                <span
                    className={`inset-0 col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-200 ${!loading ? spinnerHidden : spinnerVisible}`}
                >
                    <SpinnerIcon />
                </span>
            </button>
        </form>
    );
}
