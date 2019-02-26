import Form from '../components/Form';
import FormHeader from '../components/FormHeader';
import FormHeaderCTA from '../components/FormHeaderCTA';
import FormSubmit from '../components/FormSubmit';
import { IconRightArrow } from '../components/icons';

import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';

export default ({ error, handleSubmit }) => (
    <div className="flex flex-column items-center">
        <div className="gm-modal-form gm-signin-page">
            <FormHeader title="" error={error} errorText="Wrong email or password">
                <div className="flex justify-between items-baseline">
                    <h1>Log in</h1>
                    <FormHeaderCTA title="Not a member?" label="Sign up" icon={IconRightArrow} hash="#signup" />
                </div>
            </FormHeader>
            <Form onSubmit={handleSubmit}>
                <EmailInput bindTo="email" className="first" />
                <PasswordInput bindTo="password" className="gm-forgot-input last">
                    <a href="#request-password-reset" className="gm-forgot-link">
                        Forgot
                    </a>
                </PasswordInput>
                <FormSubmit label="Log in" />
            </Form>
        </div>
    </div>
);
