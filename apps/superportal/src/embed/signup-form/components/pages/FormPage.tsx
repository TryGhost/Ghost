import {useState, type ReactElement} from 'react';
import {isMinimal, isValidEmail} from '../../utils/helpers';
import {useAppContext} from '../../app-context';
import {FormView} from './FormView';

export function FormPage(): ReactElement {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const {api, setPage, options, t} = useAppContext();
    const minimal = isMinimal(options);

    const submit = async ({email}: {email: string}) => {
        if (!isValidEmail(email)) {
            setError(t('Please enter a valid email address'));
            return;
        }

        setError('');
        setLoading(true);

        try {
            const integrityToken = await api.getIntegrityToken();
            await api.sendMagicLink({email, labels: options.labels, integrityToken});

            if (minimal) {
                setSuccess(true);
                setLoading(false);
            } else {
                setPage('SuccessPage', {email});
            }
        } catch {
            setLoading(false);
            setError(t('Something went wrong, please try again.'));
        }
    };

    return (
        <FormView
            backgroundColor={options.backgroundColor}
            buttonColor={options.buttonColor}
            buttonTextColor={options.buttonTextColor}
            description={options.description}
            error={error}
            icon={options.icon}
            isMinimal={minimal}
            loading={loading}
            success={success}
            textColor={options.textColor}
            title={options.title}
            onSubmit={submit}
        />
    );
}
