import React, {FormEventHandler} from 'react';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export const FormView: React.FC<FormProps & {
    isMinimal: boolean
    title?: string
    description?: string
    logo?: string
    backgroundColor?: string
}> = ({isMinimal, title, description, logo, backgroundColor, ...formProps}) => {
    if (isMinimal) {
        return (
            <Form {...formProps} />
        );
    }

    return (
        <div
            className='flex h-[100vh] flex-col items-center justify-center p-6 md:p-8'
            data-testid="wrapper"
            style={{backgroundColor, color: backgroundColor && textColorForBackgroundColor(backgroundColor)}}
        >
            {logo && <img alt={title} src={logo} className='h-[50px] w-auto'/>}
            {title && <h1 className="text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">{title}</h1>}
            {description && <p className='mb-5 text-center'>{description}</p>}

            <Form {...formProps} />
        </div>
    );
};

type FormProps = {
    buttonColor?: string
    loading: boolean
    error?: string
    onSubmit: (values: { email: string }) => void
}

const Form: React.FC<FormProps> = ({loading, error, buttonColor, onSubmit}) => {
    const [email, setEmail] = React.useState('');

    const borderStyle = error ? '!border-red-500' : 'border-grey-300';

    const submitHandler: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        onSubmit({email});
    };

    return (
        <>
            <form className='relative flex w-full max-w-[440px]' onSubmit={submitHandler}>
                <input
                    className={'flex-1 py-[1rem] pl-3 border rounded-[.5rem] text-grey-900 hover:border-grey-400 transition focus-visible:border-grey-500 focus-visible:outline-none ' + borderStyle}
                    data-testid="input"
                    disabled={loading}
                    placeholder='jamie@example.com'
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <button
                    className='absolute inset-y-0 right-[.3rem] my-auto h-[3rem] rounded-[.3rem] px-3 py-2 text-white'
                    data-testid="button"
                    disabled={loading}
                    style={{backgroundColor: buttonColor, color: buttonColor && textColorForBackgroundColor(buttonColor)}}
                    type='submit'
                >Subscribe</button>
            </form>
            {error && <p className='pt-0.5 text-red-500' data-testid="error-message">{error}</p>}
        </>
    );
};
