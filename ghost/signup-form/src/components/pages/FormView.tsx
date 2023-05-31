import React, {FormEventHandler} from 'react';

export const FormView: React.FC<FormProps & {
    isMinimal: boolean
    title?: string
    description?: string
    logo?: string
}> = ({isMinimal, title, description, logo, ...formProps}) => {
    if (isMinimal) {
        return (
            <Form {...formProps} />
        );
    }

    return <div className='flex h-[52vmax] min-h-[320px] flex-col items-center justify-center bg-grey-200 p-6 md:p-8'>
        {logo && <img alt={title} src={logo} width='100' />}
        {title && <h1 className="text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">{title}</h1>}
        {description && <p className='mb-5 text-center'>{description}</p>}

        <Form {...formProps} />
    </div>;
};

type FormProps = {
    loading: boolean
    error?: string
    onSubmit: (values: { email: string }) => void
}

const Form: React.FC<FormProps> = ({loading, error, onSubmit}) => {
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
                    className={'flex-1 py-[1rem] pl-3 border rounded-[.5rem] hover:border-grey-400 transition focus-visible:border-grey-500 focus-visible:outline-none ' + borderStyle}
                    data-testid="input"
                    disabled={loading}
                    placeholder='jamie@example.com'
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <button
                    className='absolute inset-y-0 right-[.3rem] my-auto h-[3rem] rounded-[.3rem] bg-accent px-3 py-2 text-white'
                    data-testid="button"
                    disabled={loading}
                    type='submit'
                >Subscribe</button>
            </form>
            {error && <p className='pt-0.5 text-red-500' data-testid="error-message">{error}</p>}
        </>
    );
};
