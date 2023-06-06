import React, {FormEventHandler} from 'react';
import {useAppContext} from '../../AppContext';

export const FormView: React.FC<FormProps & {
    isMinimal: boolean
    title?: string
    description?: string
    logo?: string
    backgroundColor?: string
    textColor?: string
}> = ({isMinimal, title, description, logo, backgroundColor, textColor, error, ...formProps}) => {
    if (isMinimal) {
        return (
            <>
                <Form error={error} {...formProps} />
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
            {logo && <img alt={title} className='mb-2 h-[64px] w-auto' src={logo}/>}
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
    loading: boolean
    error?: string
    onSubmit: (values: { email: string }) => void
}

const Form: React.FC<FormProps> = ({loading, error, buttonColor, buttonTextColor, onSubmit}) => {
    const [email, setEmail] = React.useState('');
    const {t} = useAppContext();

    const submitHandler: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        onSubmit({email});
    };

    return (
        <>
            <form className='relative flex w-full max-w-[440px]' onSubmit={submitHandler}>
                <input
                    className={`flex-1 rounded-[.5rem] border p-2 text-grey-900 transition hover:border-grey-400 focus-visible:border-grey-500 focus-visible:outline-none sm:px-3 sm:py-[1rem] ${error ? '!border-red-500' : 'border-grey-300'}`}
                    data-testid="input"
                    disabled={loading}
                    placeholder='jamie@example.com'
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <button
                    className='absolute inset-y-0 right-[.2rem] my-auto h-7 rounded-[.3rem] px-2 text-white sm:right-[.3rem] sm:h-[3rem] sm:px-3'
                    data-testid="button"
                    disabled={loading}
                    style={{backgroundColor: buttonColor, color: buttonTextColor}}
                    type='submit'
                >{t('Subscribe')}</button>
            </form>
        </>
    );
};
