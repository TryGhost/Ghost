import React, {FormEventHandler} from 'react';
import {AppContext} from '../../AppContext';

type Props = {};

export const Form: React.FC<Props> = () => {
    const [email, setEmail] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const {api, dispatchAction} = React.useContext(AppContext);

    const submit: FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.sendMagicLink({email, emailType: 'signup'});
            dispatchAction('setPage', {
                name: 'success',
                data: {
                    email
                }
            });
        } catch (_) {
            setLoading(false);
            // handle error
        }
    };

    return <div className='bg-grey-300 p-24'>
        <p>LOGO</p>
        <h1 className="text-4xl font-bold">Hello summer</h1>
        <p className='pb-3'>Subscribe and join the movement.</p>

        <form className='flex' onSubmit={submit}>
            <input className='flex-1 p-3' disabled={loading} placeholder='jamie@example.com' type="text" value={email} onChange={e => setEmail(e.target.value)}/>
            <button className='bg-red p-3 text-white' disabled={loading} type='submit'>Subscribe</button>
        </form>
    </div>;
};
