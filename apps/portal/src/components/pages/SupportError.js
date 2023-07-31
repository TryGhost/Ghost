const SupportError = ({error}) => {
    const errorMessage = error || 'There was an error processing your payment. Please try again.';

    return (
        <div>
            {errorMessage}
        </div>
    );
};

export default SupportError;
