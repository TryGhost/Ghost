import FormHeader from '../components/FormHeader';
import FormSubmit from '../components/FormSubmit';

import Form from '../components/Form';

export default ({ error, handleSubmit }) => (
    <div className="gm-modal-form">
        <FormHeader title="Reset password" error={error} errorText="Unable to send email" />
        <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
            <div className="gm-reset-sent">
                <p>We’ve sent a recovery email to your inbox. Follow the link in the email to reset your password.</p>
            </div>
            <FormSubmit label="Close" />
        </Form>
    </div>
);
