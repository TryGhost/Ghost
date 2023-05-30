import React, {FormEventHandler} from 'react';
import {isMinimal} from '../../utils/helpers';
import {isValidEmail} from '../../utils/validator';
import {useAppContext} from '../../AppContext';

export const FormPage: React.FC = () => {
    const {options} = useAppContext();

    if (isMinimal(options)) {
        return (
            <Form />
        );
    }

    const title = options.title;
    const description = options.description;
    const logo = options.logo;

    return <div className='bg-grey-200 flex h-[52vmax] min-h-[320px] flex-col items-center justify-center p-6 md:p-8'>
        {logo && <img alt={title} src={logo} width='100' />}
        {title && <h1 className="text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">{title}</h1>}
        {description && <p className='mb-5 text-center'>{description}</p>}

        <Form />
    </div>;
};

const Form: React.FC = () => {
    const [email, setEmail] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const {api, setPage, options} = useAppContext();
    const labels = options.labels;

    const submit: FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!isValidEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await api.sendMagicLink({email, labels});
            setPage('SuccessPage', {
                email
            });
        } catch (_) {
            setLoading(false);
            setError('Something went wrong, please try again.');
        }
    };

    const borderStyle = error ? '!border-red-500' : 'border-grey-300';

    return (
        <>
            <form className='relative flex w-full max-w-[440px]' onSubmit={submit}>
                <input className={'flex-1 py-[1rem] pl-3 border rounded-[.5rem] hover:border-grey-400 transition focus-visible:border-grey-500 focus-visible:outline-none ' + borderStyle} data-testid="input" disabled={loading} placeholder='jamie@example.com' type="text" value={email} onChange={e => setEmail(e.target.value)}/>
                <button className='bg-accent absolute inset-y-0 right-[.3rem] my-auto h-[3rem] rounded-[.3rem] px-3 py-2 text-white' data-testid="button" disabled={loading} type='submit'>Subscribe</button>
            </form>
            {error && <p className='pt-0.5 text-red-500' data-testid="error-message">{error}</p>}
        </>
    );
};
