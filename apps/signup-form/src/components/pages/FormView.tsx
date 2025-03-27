import React, {FormEventHandler} from 'react';
import {ReactComponent as LoadingIcon} from '../../../assets/icons/spinner.svg';
import {useAppContext} from '../../AppContext';

export const FormView: React.FC<FormProps & {
    isMinimal: boolean
    title?: string
    description?: string
    icon?: string
    backgroundColor?: string
    textColor?: string
}> = ({isMinimal, title, description, icon, backgroundColor, textColor, error, ...formProps}) => {
    if (isMinimal) {
        return (
            <>
                <Form error={error} isMinimal={isMinimal} {...formProps} />
                {error && <p className='text-red-500' data-testid="error-message">{error}</p>}
            </>
        );
    }

    return (
        <div
            className='flex h-[100vh] flex-col items-center justify-center px-4 sm:px-6 md:px-10'
            data-testid="wrapper"
            style={{backgroundColor, color: textColor}}
        >
            {icon && <img alt={title} className='mb-2 h-[64px] w-auto' src={icon}/>}
            {title && <h1 className="text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">{title}</h1>}
            {description && <p className='mb-4 text-center font-medium md:mb-5'>{description}</p>}
            <div className='relative w-full max-w-[440px]'>
                <Form error={error} {...formProps} />
                <p className={`h-5 w-full text-left text-red-500 ${error ? 'visible' : 'invisible'}`} data-testid="error-message">{error}</p>
            </div>

        </div>
    );
};

type FormProps = {
    buttonColor?: string
    buttonTextColor?: string
    isMinimal?: boolean
    loading: boolean
    success: boolean
    error?: string
    onSubmit: (values: { email: string }) => void
}

const Form: React.FC<FormProps> = ({isMinimal, loading, success, error, buttonColor, buttonTextColor, onSubmit}) => {
    const [email, setEmail] = React.useState('');
    const {t} = useAppContext();

    const submitHandler: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        onSubmit({email});
    };

    // The complicated transitions are here so that we animate visibility: hidden (step-start/step-end), which is required for screen readers to know what is visible (they ignore opacity: 0)
    return (
        <>
            <form className={`relative flex w-full rounded-[.5rem] border bg-white p-[3px] text-grey-900 transition hover:border-grey-400 focus-visible:border-grey-500 ${error ? '!border-red-500' : 'border-grey-300'}`} onSubmit={submitHandler}>
                <input
                    className={`w-full px-2 py-1 focus-visible:outline-none disabled:bg-white xs:p-2`}
                    data-testid="input"
                    disabled={loading || success}
                    placeholder={t('Your email address')}
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <button
                    className='my-auto grid h-7 touch-manipulation grid-cols-[1fr] items-center rounded-[.3rem] px-2 font-medium text-white xs:h-[3rem] xs:px-3'
                    data-testid="button"
                    disabled={loading || success}
                    style={{backgroundColor: buttonColor, color: buttonTextColor}}
                    type='submit'
                >
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${loading || success ? '[opacity_200ms,visibility_200ms_step-end] invisible opacity-0' : 'opacity-1 [opacity_200ms,visibility_200ms_step-start] visible'}`}>{t('Subscribe')}</span>
                    {isMinimal && <span className={`col-start-1 row-start-1 whitespace-nowrap ${loading || !success ? 'invisible mx-[-40px] opacity-0 [transition:margin_300ms,opacity_200ms,visibility_200ms_step-end]' : 'opacity-1 visible mx-0 [transition:margin_300ms,opacity_200ms,visibility_200ms_step-start]'}`}>{t('Email sent')}</span>}
                    <span className={`inset-0 col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-200 ${!loading ? '[opacity_200ms,visibility_200ms_step-end] invisible opacity-0' : 'opacity-1 [opacity_200ms,visibility_200ms_step-start] visible' }`}><LoadingIcon /></span>
                </button>
            </form>
        </>
    );
};
