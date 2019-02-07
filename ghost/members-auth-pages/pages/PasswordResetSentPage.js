import FormHeader from '../components/FormHeader';
import FormSubmit from '../components/FormSubmit';
import { IconClose } from '../components/icons';

export default ({error, handleClose, handleSubmit}) => (
    <div className="gm-modal-container">
        <div className="gm-modal gm-auth-modal" onClick={(e) => e.stopPropagation()}>
            <a className="gm-modal-close" onClick={handleClose}>{ IconClose }</a>
            <FormHeader title="Sign up" error={error} errorText="Unable to send email"/>
            <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
                <div className="gm-reset-sent">
                    <p>We’ve sent a recovery email to your inbox. Follow the link in the email to reset your password.</p>
                </div>
                <FormSubmit label="Resend instructions" />
            </Form>
        </div>
    </div>
);
