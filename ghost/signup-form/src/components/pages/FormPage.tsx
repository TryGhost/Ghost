import React from 'react';
import {FormView} from './FormView';
import {isMinimal} from '../../utils/helpers';
import {isValidEmail} from '../../utils/validator';
import {useAppContext} from '../../AppContext';

export const FormPage: React.FC = () => {
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const {api, setPage, options, t} = useAppContext();

    const submit = async ({email}: { email: string }) => {
        if (!isValidEmail(email)) {
            setError(t(`Please enter a valid email address`));
            return;
        }

        setError('');
        setLoading(true);

        try {
            await api.sendMagicLink({email, labels: options.labels});
            setPage('SuccessPage', {
                email
            });
        } catch (_) {
            setLoading(false);
            setError(t(`Something went wrong, please try again.`));
        }
    };

    return <FormView
        backgroundColor={options.backgroundColor}
        buttonColor={options.buttonColor}
        buttonTextColor={options.buttonTextColor}
        description={options.description}
        error={error}
        isMinimal={isMinimal(options)}
        loading={loading}
        logo={options.logo}
        textColor={options.textColor}
        title={options.title}
        onSubmit={submit}
    />;
};
