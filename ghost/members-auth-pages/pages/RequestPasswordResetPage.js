import FormHeader from '../components/FormHeader';
import EmailInput from '../components/EmailInput';
import FormSubmit from '../components/FormSubmit';

import Form from '../components/Form';

export default ({ error, handleClose, handleSubmit }) => (
    <div>
        <FormHeader title="Reset password" error={error} errorText="Unable to send email" />
        <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
            <EmailInput bindTo="email" />
            <FormSubmit label="Send reset password instructions" />
        </Form>
    </div>
);
