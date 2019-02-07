import FormHeader from '../components/FormHeader';
import PasswordInput from '../components/PasswordInput';
import FormSubmit from '../components/FormSubmit';
import Form from '../components/Form';
import { IconClose } from '../components/icons';

const getTokenData = frameLocation => {
    const params = new URLSearchParams(frameLocation.query);
    const token = params.get('token') || '';
    return { token };

};

export default ({error, frameLocation, handleClose, handleSubmit}) => (
    <div className="gm-modal-container">
        <div className="gm-modal gm-auth-modal" onClick={(e) => e.stopPropagation()}>
            <a className="gm-modal-close" onClick={handleClose}>{ IconClose }</a>
            <FormHeader title="Reset password" error={error} errorText="Unable to reset password"/>
            <Form includeData={getTokenData(frameLocation)} onSubmit={handleSubmit}>
                <PasswordInput bindTo="password" />
                <FormSubmit label="Set password" />
            </Form>
        </div>
    </div>
);
