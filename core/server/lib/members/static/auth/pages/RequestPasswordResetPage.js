import FormHeader from '../components/FormHeader';
import EmailInput from '../components/EmailInput';
import FormSubmit from '../components/FormSubmit';

import Form from '../components/Form';

export default ({ error, handleClose, handleSubmit }) => (
    <div className="gm-modal-form gm-reset-pwd-page">
        <FormHeader title="Reset password" error={error} errorText="Unable to send email" />
        <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
            <EmailInput bindTo="email" className="single" />
            <FormSubmit label="Send reset password instructions" />
            <div class="flex justify-center mt5">
                <a href="#signin">Cancel</a>
            </div>
        </Form>
    </div>
);
