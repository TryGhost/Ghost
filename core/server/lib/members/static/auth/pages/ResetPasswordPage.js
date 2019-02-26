import FormHeader from '../components/FormHeader';
import PasswordInput from '../components/PasswordInput';
import FormSubmit from '../components/FormSubmit';
import Form from '../components/Form';

const getTokenData = frameLocation => {
    const params = new URLSearchParams(frameLocation.query);
    const token = params.get('token') || '';
    return { token };

};

export default ({ error, frameLocation, handleSubmit }) => (
    <div className="gm-modal-form">
        <FormHeader title="Reset password" error={error} errorText="Unable to reset password" />
        <Form includeData={getTokenData(frameLocation)} onSubmit={handleSubmit}>
            <PasswordInput bindTo="password" className="single" />
            <FormSubmit label="Set password" />
        </Form>
    </div>
);
