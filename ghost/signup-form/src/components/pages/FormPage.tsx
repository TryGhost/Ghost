import React from 'react';
import {FormView} from './FormView';
import {isMinimal} from '../../utils/helpers';
import {isValidEmail} from '../../utils/validator';
import {useAppContext} from '../../AppContext';

export const FormPage: React.FC = () => {
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const {api, setPage, options, i18n} = useAppContext();

    const submit = async ({email}: { email: string }) => {
        if (!isValidEmail(email)) {
            setError(i18n(`Please enter a valid email address.`));
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
            setError(i18n(`Something went wrong, please try again.`));
        }
    };

    return <FormView
        backgroundColor={options.backgroundColor}
        buttonColor={options.buttonColor}
        description={options.description}
        error={error}
        isMinimal={isMinimal(options)}
        loading={loading}
        logo={options.logo}
        title={options.title}
        onSubmit={submit}
    />;
};
