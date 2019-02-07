import FormHeader from '../components/FormHeader';
import EmailInput from '../components/EmailInput';
import FormSubmit from '../components/FormSubmit';
import { IconClose } from '../components/icons';

import Form from '../components/Form';

export default ({error, handleClose, handleSubmit}) => (
    <div className="gm-modal-container">
        <div className="gm-modal gm-auth-modal" onClick={(e) => e.stopPropagation()}>
            <a className="gm-modal-close" onClick={handleClose}>{ IconClose }</a>
            <FormHeader title="Reset password" error={error} errorText="Unable to send email"/>
            <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
                <EmailInput bindTo="email"/>
                <FormSubmit label="Send reset password instructions"/>
            </Form>
        </div>
    </div>
);
