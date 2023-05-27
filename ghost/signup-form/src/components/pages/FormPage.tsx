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

    return <div className='bg-grey-300 p-24'>
        {logo && <img alt={title} src={logo} width='100' />}
        {title && <h1 className="text-4xl font-bold">{title}</h1>}
        {description && <p className='pb-3'>{description}</p>}

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

    const borderStyle = error ? 'border-red-500' : 'border-grey-500';

    return (
        <div>
            <form className='flex' onSubmit={submit}>
                <input className={'flex-1 p-3 border ' + borderStyle} disabled={loading} placeholder='jamie@example.com' type="text" value={email} onChange={e => setEmail(e.target.value)}/>
                <button className='bg-accent p-3 text-white' disabled={loading} type='submit'>Subscribe</button>
            </form>
            {error && <p className='pt-0.5 text-red-500'>{error}</p>}
        </div>
    );
};
