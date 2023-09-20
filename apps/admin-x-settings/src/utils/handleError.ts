import toast from 'react-hot-toast';
import {APIError, ValidationError} from './errors';
import {showToast} from '../admin-x-ds/global/Toast';

const handleError = (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);

    toast.remove();

    if (error instanceof ValidationError && error.data?.errors[0]) {
        showToast({
            message: error.data.errors[0].context || error.data.errors[0].message,
            type: 'pageError'
        });
    } else if (error instanceof APIError) {
        showToast({
            message: error.message,
            type: 'pageError'
        });
    } else {
        showToast({
            message: 'Something went wrong, please try again.',
            type: 'pageError'
        });
    }
};

export default handleError;
